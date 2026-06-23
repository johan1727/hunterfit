import { GoogleGenerativeAI } from '@google/generative-ai';
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
    throw new Error('EXPO_PUBLIC_GEMINI_API_KEY no está configurada');
  }
  return new GoogleGenerativeAI(apiKey);
};

// ============================================================================
// PROMPT BUILDER
// ============================================================================

const buildRecipePrompt = (request: RecipeRequest, availableFoods: Food[]): string => {
  const foodList = availableFoods
    .map(
      f =>
        `- ${f.name_es} (${f.kcal} kcal, ${f.protein_g}g prot, ${f.carbs_g}g carbs, ${f.fat_g}g fat, ícono: 🍽️)`
    )
    .slice(0, 100)
    .join('\n');

  const mealTypeMap: Record<string, string> = {
    breakfast: 'desayuno',
    lunch: 'comida',
    dinner: 'cena',
    snack: 'snack/merienda',
  };

  return `Eres nutricionista experto especializado en recetas personalizadas. Crea una receta deliciosa y realista para ${mealTypeMap[request.mealType] || request.mealType}:

**MACROS OBJETIVO (calculadas según perfil del usuario):**
- Calorías: ${request.userCalories} kcal
- Proteína: ${request.userProtein}g
- Carbohidratos: ${request.userCarbs}g
- Grasas: ${request.userFat}g

**ALIMENTOS DISPONIBLES EN LA BASE DE DATOS:**
${foodList}

**PREFERENCIAS DEL USUARIO:** ${request.preferences?.join(', ') || 'Sin restricciones'}
**TIPO DE COCINA:** ${request.cuisine || 'Latinoamericana'}
**PORCIONES:** ${request.servings || 1}

**INSTRUCCIONES CRÍTICAS:**
1. Selecciona SOLO alimentos de la lista proporcionada
2. Los alimentos deben estar lo más cerca posible de los macros objetivo (tolerancia ±10%)
3. La receta debe ser realista, deliciosa y fácil de preparar
4. Incluye cantidades en gramos
5. Proporciona pasos claros de preparación
6. Asigna dificultad: "fácil" (≤15 min), "moderado" (15-30 min), "difícil" (>30 min)

**RESPONDE EXACTAMENTE en este formato JSON válido (sin markdown, sin bloques de código):**
{
  "title": "Nombre creativo de la receta",
  "description": "Descripción breve y apetitosa en 1-2 frases",
  "foods": [
    {
      "name": "Nombre del alimento exacto de la lista",
      "quantity_g": 150,
      "reason": "Por qué incluyo este alimento"
    }
  ],
  "prepTime": 25,
  "difficulty": "moderado",
  "steps": [
    "Paso 1: Descripción clara",
    "Paso 2: Descripción clara"
  ]
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

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se encontró JSON válido en la respuesta de Gemini');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Map foods back with macros from database
    const recipeFoods: RecipeFood[] = parsed.foods.map((f: any) => {
      const foodData = availableFoods.find(af =>
        af.name_es.toLowerCase().includes(f.name.toLowerCase())
      );

      if (!foodData) {
        throw new Error(`Alimento no encontrado en BD: "${f.name}"`);
      }

      const multiplier = f.quantity_g / foodData.serving_g;
      return {
        name_es: foodData.name_es,
        quantity_g: Math.round(f.quantity_g),
        kcal: Math.round(foodData.kcal * multiplier),
        protein_g: Math.round(foodData.protein_g * multiplier * 10) / 10,
        carbs_g: Math.round(foodData.carbs_g * multiplier * 10) / 10,
        fat_g: Math.round(foodData.fat_g * multiplier * 10) / 10,
        icon: '🍽️', // Default icon, can be enhanced with food category mapping
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
  const recipes: GeneratedRecipe[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const recipe = await generateRecipeWithGemini(request, availableFoods);
      recipes.push(recipe);

      // Rate limiting: wait 500ms between requests
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Error generando receta ${i + 1}:`, error);
      // Continue with next recipe instead of throwing
    }
  }

  if (recipes.length === 0) {
    throw new Error('No se pudo generar ninguna receta');
  }

  return recipes;
}
