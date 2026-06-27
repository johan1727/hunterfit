import { GoogleGenerativeAI } from '@google/generative-ai';
import Fuse from 'fuse.js';
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
// GEMINI CLIENT
// ============================================================================

const getGenAIClient = () => {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('EXPO_PUBLIC_GEMINI_API_KEY no configurada. Verifica .env');
    throw new Error('API key de Gemini no encontrada. Verifica EXPO_PUBLIC_GEMINI_API_KEY en .env');
  }
  console.log('✅ Gemini API key cargada');
  return new GoogleGenerativeAI(apiKey);
};

// ============================================================================
// PROMPT BUILDER
// ============================================================================

const buildRecipePrompt = (request: RecipeRequest, availableFoods: Food[]): string => {
  // Limitar a 50 alimentos para respuesta más rápida
  const foodList = availableFoods
    .slice(0, 50)
    .map(
      f =>
        `- ${f.name_es} (${f.kcal} kcal, ${f.protein_g}g prot, ${f.carbs_g}g carbs, ${f.fat_g}g fat)`
    )
    .join('\n');

  const mealTypeMap: Record<string, string> = {
    breakfast: 'desayuno',
    lunch: 'comida',
    dinner: 'cena',
    snack: 'snack/merienda',
  };

  const prefsText = request.preferences?.length
    ? `\nPreferencias del usuario: incluir principalmente alimentos de los grupos ${request.preferences.join(', ')}.`
    : '';

  return `Crea una receta rápida para ${mealTypeMap[request.mealType] || request.mealType}.${prefsText}

Macros objetivo: ${request.userCalories} kcal, ${request.userProtein}g prot, ${request.userCarbs}g carbs, ${request.userFat}g grasa.

Alimentos disponibles:
${foodList}

Instrucciones: Selecciona SOLO alimentos de la lista. Aproxima los macros (±10%). Receta simple en 15-30 min. Cocina: ${request.cuisine || 'Latina'}.

Responde SOLO en JSON (sin markdown, sin bloques de código):
{
  "title": "Nombre creativo",
  "description": "Descripción breve",
  "foods": [{"name": "Alimento de la lista", "quantity_g": 150}],
  "prepTime": 20,
  "difficulty": "fácil",
  "steps": ["Paso 1", "Paso 2", "Paso 3"]
}`;
};

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

    const genAI = getGenAIClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = buildRecipePrompt(request, availableFoods);

    console.log('📝 Enviando prompt a Gemini...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log('✅ Respuesta recibida de Gemini');

    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se encontró JSON válido en la respuesta de Gemini');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Map foods back with macros from database
    // Initialize Fuse.js for fuzzy matching
    const fuse = new Fuse(availableFoods, {
      keys: ['name_es'],
      threshold: 0.4, // Flexibilidad: 40% de similitud mínima
      ignoreLocation: true,
      minMatchCharLength: 2,
    });

    const recipeFoods: RecipeFood[] = parsed.foods.map((f: any) => {
      const searchName = f.name.toLowerCase().trim();

      // 1. Busca match exacto
      let foodData = availableFoods.find(af =>
        af.name_es.toLowerCase() === searchName
      );

      // 2. Si no, intenta fuzzy search con Fuse.js
      if (!foodData) {
        const fuzzyResults = fuse.search(searchName);
        if (fuzzyResults.length > 0) {
          foodData = fuzzyResults[0].item;
          console.log(`✨ Fuzzy match encontrado: "${searchName}" -> "${foodData.name_es}"`);
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
  console.log(`⚡ Generando ${count} recetas en paralelo...`);
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
  const genAI = getGenAIClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const context = `
Receta: ${recipe.title}
Descripción: ${recipe.description}
Ingredientes: ${recipe.foods.map(f => `${f.name_es} (${f.quantity_g}g)`).join(', ')}
Pasos: ${recipe.steps.join(' | ')}
Macros totales: ${recipe.totalKcal} kcal, ${recipe.totalProtein}g proteína, ${recipe.totalCarbs}g carbos, ${recipe.totalFat}g grasa
Dificultad: ${recipe.difficulty}, Tiempo: ${recipe.prepTime} min
`;

  const prompt = `Eres un nutricionista y chef experto. Responde de forma concisa y útil (máximo 3 oraciones) la siguiente pregunta sobre esta receta.

RECETA:
${context}

PREGUNTA: ${question}

Responde en español, de forma directa y práctica.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
