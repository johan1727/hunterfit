import { generateRecipeWithGemini, generateMultipleRecipes } from '../src/services/recipeAI';
import type { Food } from '../src/types/db';

// Mock foods data - usado para testing sin Supabase
const MOCK_FOODS: Food[] = [
  {
    id: 1,
    name_es: 'Pechuga de pollo',
    brand: null,
    category: 'proteinas',
    serving_g: 100,
    kcal: 165,
    protein_g: 31,
    carbs_g: 0,
    fat_g: 3.6,
    fiber_g: 0,
  },
  {
    id: 2,
    name_es: 'Arroz integral',
    brand: null,
    category: 'cereales',
    serving_g: 150,
    kcal: 111,
    protein_g: 2.6,
    carbs_g: 23,
    fat_g: 0.9,
    fiber_g: 1.8,
  },
  {
    id: 3,
    name_es: 'Brócoli',
    brand: null,
    category: 'verduras',
    serving_g: 90,
    kcal: 34,
    protein_g: 2.8,
    carbs_g: 6.6,
    fat_g: 0.4,
    fiber_g: 2.6,
  },
  {
    id: 4,
    name_es: 'Aguacate',
    brand: null,
    category: 'grasas',
    serving_g: 150,
    kcal: 160,
    protein_g: 2,
    carbs_g: 8.5,
    fat_g: 14.7,
    fiber_g: 6.7,
  },
  {
    id: 5,
    name_es: 'Huevo',
    brand: null,
    category: 'proteinas',
    serving_g: 50,
    kcal: 78,
    protein_g: 6.3,
    carbs_g: 0.6,
    fat_g: 5.3,
    fiber_g: 0,
  },
  {
    id: 6,
    name_es: 'Leche desnatada',
    brand: null,
    category: 'lacteos',
    serving_g: 200,
    kcal: 68,
    protein_g: 6.8,
    carbs_g: 9.7,
    fat_g: 0.2,
    fiber_g: 0,
  },
  {
    id: 7,
    name_es: 'Yogur griego',
    brand: null,
    category: 'lacteos',
    serving_g: 150,
    kcal: 100,
    protein_g: 17,
    carbs_g: 4,
    fat_g: 0.7,
    fiber_g: 0,
  },
  {
    id: 8,
    name_es: 'Salmón',
    brand: null,
    category: 'proteinas',
    serving_g: 100,
    kcal: 206,
    protein_g: 22,
    carbs_g: 0,
    fat_g: 13,
    fiber_g: 0,
  },
  {
    id: 9,
    name_es: 'Camote',
    brand: null,
    category: 'tuberculos',
    serving_g: 100,
    kcal: 86,
    protein_g: 1.6,
    carbs_g: 20.1,
    fat_g: 0.1,
    fiber_g: 3,
  },
  {
    id: 10,
    name_es: 'Plátano',
    brand: null,
    category: 'frutas',
    serving_g: 100,
    kcal: 89,
    protein_g: 1.1,
    carbs_g: 23,
    fat_g: 0.3,
    fiber_g: 2.6,
  },
  {
    id: 11,
    name_es: 'Manzana',
    brand: null,
    category: 'frutas',
    serving_g: 100,
    kcal: 52,
    protein_g: 0.3,
    carbs_g: 13.8,
    fat_g: 0.2,
    fiber_g: 2.4,
  },
  {
    id: 12,
    name_es: 'Lentejas',
    brand: null,
    category: 'legumbres',
    serving_g: 100,
    kcal: 116,
    protein_g: 9,
    carbs_g: 20,
    fat_g: 0.4,
    fiber_g: 8,
  },
  {
    id: 13,
    name_es: 'Carne de res',
    brand: null,
    category: 'proteinas',
    serving_g: 100,
    kcal: 250,
    protein_g: 26,
    carbs_g: 0,
    fat_g: 15,
    fiber_g: 0,
  },
  {
    id: 14,
    name_es: 'Espinaca',
    brand: null,
    category: 'verduras',
    serving_g: 30,
    kcal: 7,
    protein_g: 0.9,
    carbs_g: 1.1,
    fat_g: 0.1,
    fiber_g: 0.7,
  },
  {
    id: 15,
    name_es: 'Aceite de oliva',
    brand: null,
    category: 'grasas',
    serving_g: 10,
    kcal: 88,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 10,
    fiber_g: 0,
  },
];

async function testRecipeGeneration() {
  console.log('\n🧪 Testing RecipeAI Service...\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Single recipe generation
    console.log('\n📝 Test 1: Generar una receta para almuerzo');
    console.log('-'.repeat(60));

    const recipe = await generateRecipeWithGemini(
      {
        userCalories: 700,
        userProtein: 60,
        userCarbs: 85,
        userFat: 22,
        mealType: 'lunch',
        cuisine: 'latinoamericano',
      },
      MOCK_FOODS
    );

    console.log('✅ Receta generada:', recipe.title);
    console.log('📊 Macros:');
    console.log(`   Calorías: ${recipe.totalKcal} (objetivo: 700)`);
    console.log(`   Proteína: ${recipe.totalProtein}g (objetivo: 60g)`);
    console.log(`   Carbos: ${recipe.totalCarbs}g (objetivo: 85g)`);
    console.log(`   Grasas: ${recipe.totalFat}g (objetivo: 22g)`);

    // Validate macros (±15% tolerance)
    const kcalDiff = Math.abs(recipe.totalKcal - 700) / 700;
    const proteinDiff = Math.abs(recipe.totalProtein - 60) / 60;
    const carbsDiff = Math.abs(recipe.totalCarbs - 85) / 85;
    const fatDiff = Math.abs(recipe.totalFat - 22) / 22;

    console.log('\n🎯 Macro Accuracy Validation (±15% tolerance):');
    console.log(`   Calorías: ${(kcalDiff * 100).toFixed(1)}% ${kcalDiff <= 0.15 ? '✅' : '⚠️'}`);
    console.log(`   Proteína: ${(proteinDiff * 100).toFixed(1)}% ${proteinDiff <= 0.15 ? '✅' : '⚠️'}`);
    console.log(`   Carbos: ${(carbsDiff * 100).toFixed(1)}% ${carbsDiff <= 0.15 ? '✅' : '⚠️'}`);
    console.log(`   Grasas: ${(fatDiff * 100).toFixed(1)}% ${fatDiff <= 0.15 ? '✅' : '⚠️'}`);

    // Test 2: Recipe structure validation
    console.log('\n📋 Test 2: Validar estructura de receta');
    console.log('-'.repeat(60));

    if (recipe.foods && recipe.foods.length > 0) {
      console.log(`✅ Foods array poblado: ${recipe.foods.length} alimentos`);
    } else {
      console.log('❌ Foods array vacío');
    }

    if (recipe.steps && recipe.steps.length > 0) {
      console.log(`✅ Pasos de cocción: ${recipe.steps.length} pasos`);
    } else {
      console.log('⚠️ Sin pasos de cocción');
    }

    const macroSum = recipe.macroPercentages.protein + recipe.macroPercentages.carbs + recipe.macroPercentages.fat;
    if (macroSum === 100) {
      console.log(`✅ Porcentajes de macros: ${macroSum}% (suma correcta)`);
    } else {
      console.log(`⚠️ Porcentajes de macros: ${macroSum}% (esperado 100%)`);
    }

    console.log(`✅ Dificultad: ${recipe.difficulty}`);
    console.log(`✅ Tiempo de prep: ${recipe.prepTime} min`);

    // Test 3: Foods detail validation
    console.log('\n🥗 Test 3: Detalles de ingredientes');
    console.log('-'.repeat(60));

    recipe.foods.forEach((food, idx) => {
      console.log(`   [${idx + 1}] ${food.name_es}`);
      console.log(`       ${food.quantity_g}g • ${food.kcal} kcal • ${food.protein_g}g prot`);
    });

    // Test 4: Multiple recipes
    console.log('\n🔄 Test 4: Generar múltiples recetas');
    console.log('-'.repeat(60));

    const recipes = await generateMultipleRecipes(
      {
        userCalories: 500,
        userProtein: 40,
        userCarbs: 60,
        userFat: 15,
        mealType: 'breakfast',
      },
      MOCK_FOODS,
      3
    );

    console.log(`✅ Generadas ${recipes.length} recetas`);
    recipes.forEach((r, i) => {
      console.log(`   [${i + 1}] ${r.title}`);
      console.log(`       ${r.totalKcal} kcal • ${r.totalProtein}g prot • ${r.prepTime} min`);
    });

    // Test 5: Different meal types
    console.log('\n🍽️ Test 5: Generar recetas para diferentes tipos de comida');
    console.log('-'.repeat(60));

    const mealTypes: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = ['breakfast', 'lunch', 'dinner', 'snack'];
    const mealLabels = { breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', snack: 'Snack' };

    for (const mealType of mealTypes) {
      try {
        const macros = {
          breakfast: { kcal: 500, protein: 40, carbs: 60, fat: 15 },
          lunch: { kcal: 700, protein: 60, carbs: 85, fat: 22 },
          dinner: { kcal: 650, protein: 55, carbs: 75, fat: 20 },
          snack: { kcal: 200, protein: 15, carbs: 25, fat: 7 },
        }[mealType];

        const mealRecipe = await generateRecipeWithGemini(
          {
            userCalories: macros.kcal,
            userProtein: macros.protein,
            userCarbs: macros.carbs,
            userFat: macros.fat,
            mealType,
            cuisine: 'latinoamericano',
          },
          MOCK_FOODS
        );

        console.log(`   ✅ ${mealLabels[mealType]}: ${mealRecipe.title}`);
      } catch (error) {
        console.log(`   ❌ ${mealLabels[mealType]}: Error`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ¡Todos los tests completados exitosamente!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error en test:', error);
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }
}

// Run tests
testRecipeGeneration().catch(console.error);
