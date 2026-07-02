import Fuse from 'fuse.js';
import { supabase } from '../lib/supabase';
import { describeFunctionError } from './ai';
import type { Food } from '../types/db';

// ============================================================================
// TYPES
// ============================================================================

export interface RecipeRequest {
  userCalories: number;
  userProtein: number;
  userCarbs: number;
  userFat: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  preferences?: string[];
  cuisine?: string;
  servings?: number;
}

export interface RecipeFood {
  name_es: string;
  quantity_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  icon: string;
}

export interface GeneratedRecipe {
  id: string;
  title: string;
  description: string;
  foods: RecipeFood[];
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  prepTime: number;
  difficulty: 'fácil' | 'moderado' | 'difícil';
  steps: string[];
  macroPercentages: { protein: number; carbs: number; fat: number };
  timestamp: Date;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export async function generateRecipeWithGemini(
  request: RecipeRequest,
  availableFoods: Food[]
): Promise<GeneratedRecipe> {
  try {
    if (!availableFoods || availableFoods.length === 0) {
      throw new Error('No hay alimentos disponibles en la base de datos');
    }

    // Solo enviamos una proyección slim (sin ids/porciones) al Edge Function;
    // el prompt completo se construye server-side.
    const slimFoods = availableFoods.slice(0, 50).map(f => ({
      name_es: f.name_es,
      kcal: f.kcal,
      protein_g: f.protein_g,
      carbs_g: f.carbs_g,
      fat_g: f.fat_g,
    }));

    const { data, error } = await supabase.functions.invoke('generate-recipe', {
      body: { mode: 'recipe', request, foods: slimFoods },
    });
    if (error) throw new Error(await describeFunctionError(error));

    const parsed = data?.recipe;
    if (!parsed || !Array.isArray(parsed.foods)) {
      throw new Error('La receta generada no tiene el formato esperado. Intenta de nuevo.');
    }

    // Map foods back with macros from database
    // Initialize Fuse.js for fuzzy matching
    const fuse = new Fuse(availableFoods, {
      keys: ['name_es'],
      threshold: 0.4, // Flexibilidad: 40% de similitud mínima
      ignoreLocation: true,
      minMatchCharLength: 2,
    });

    const recipeFoods: RecipeFood[] = parsed.foods.map((f: any) => {
      const searchName = String(f?.name ?? '').toLowerCase().trim();

      // 1. Busca match exacto
      let foodData = availableFoods.find(af =>
        af.name_es.toLowerCase() === searchName
      );

      // 2. Si no, intenta fuzzy search con Fuse.js
      if (!foodData) {
        const fuzzyResults = fuse.search(searchName);
        if (fuzzyResults.length > 0) {
          foodData = fuzzyResults[0].item;
        }
      }

      // 3. Si aún no encuentra, toma uno random como fallback
      if (!foodData) {
        console.warn(`⚠️ Alimento no encontrado: "${f.name}", usando sustituto aleatorio`);
        foodData = availableFoods[Math.floor(Math.random() * availableFoods.length)];
      }

      const multiplier = f.quantity_g / foodData.serving_g;
      return {
        name_es: foodData.name_es,
        quantity_g: Math.round(f.quantity_g),
        kcal: Math.round(foodData.kcal * multiplier),
        protein_g: Math.round(foodData.protein_g * multiplier * 10) / 10,
        carbs_g: Math.round(foodData.carbs_g * multiplier * 10) / 10,
        fat_g: Math.round(foodData.fat_g * multiplier * 10) / 10,
        icon: foodData.icon || '🍽️',
      };
    });

    // Calculate totals
    const totals = recipeFoods.reduce(
      (acc, f) => ({
        kcal: acc.kcal + f.kcal,
        protein: acc.protein + f.protein_g,
        carbs: acc.carbs + f.carbs_g,
        fat: acc.fat + f.fat_g,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const totalCalories = totals.kcal || 1;

    // Calculate macro percentages (protein and carbs: 4 kcal/g, fat: 9 kcal/g)
    const proteinKcal = totals.protein * 4;
    const carbsKcal = totals.carbs * 4;
    const fatKcal = totals.fat * 9;
    const totalMacroKcal = proteinKcal + carbsKcal + fatKcal || 1;

    return {
      id: `recipe_${Date.now()}`,
      title: parsed.title || 'Receta Personalizada',
      description: parsed.description || 'Receta generada con IA',
      foods: recipeFoods,
      totalKcal: Math.round(totals.kcal),
      totalProtein: Math.round(totals.protein * 10) / 10,
      totalCarbs: Math.round(totals.carbs * 10) / 10,
      totalFat: Math.round(totals.fat * 10) / 10,
      prepTime: parsed.prepTime || 30,
      difficulty: (parsed.difficulty || 'moderado') as 'fácil' | 'moderado' | 'difícil',
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      macroPercentages: {
        protein: Math.round((proteinKcal / totalMacroKcal) * 100),
        carbs: Math.round((carbsKcal / totalMacroKcal) * 100),
        fat: Math.round((fatKcal / totalMacroKcal) * 100),
      },
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('🔥 Error en RecipeAI:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`RecipeAI Error: ${message}`);
  }
}

// ============================================================================
// BATCH GENERATION
// ============================================================================

/**
 * Genera múltiples recetas con pequeños delays para respetar rate limits
 */
export async function generateMultipleRecipes(
  request: RecipeRequest,
  availableFoods: Food[],
  count: number = 3
): Promise<GeneratedRecipe[]> {
  // Generar en PARALELO — Gemini Flash maneja varias llamadas concurrentes sin problema.
  // Esto reduce el tiempo total de ~3x a ~1x (la receta más lenta).
  const results = await Promise.allSettled(
    Array.from({ length: count }, () => generateRecipeWithGemini(request, availableFoods))
  );

  const recipes: GeneratedRecipe[] = [];
  results.forEach((res, i) => {
    if (res.status === 'fulfilled') {
      recipes.push(res.value);
    } else {
      console.error(`Error generando receta ${i + 1}:`, res.reason);
    }
  });

  if (recipes.length === 0) {
    throw new Error('No se pudo generar ninguna receta');
  }

  return recipes;
}

// ============================================================================
// RECIPE Q&A
// ============================================================================

export async function askRecipeQuestion(
  question: string,
  recipe: GeneratedRecipe
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-recipe', {
    body: {
      mode: 'ask',
      question,
      recipe: {
        title: recipe.title,
        description: recipe.description,
        foods: recipe.foods.map(f => ({ name_es: f.name_es, quantity_g: f.quantity_g })),
        steps: recipe.steps,
        totalKcal: recipe.totalKcal,
        totalProtein: recipe.totalProtein,
        totalCarbs: recipe.totalCarbs,
        totalFat: recipe.totalFat,
        difficulty: recipe.difficulty,
        prepTime: recipe.prepTime,
      },
    },
  });
  if (error) throw new Error(await describeFunctionError(error));
  return data?.answer ?? '';
}
