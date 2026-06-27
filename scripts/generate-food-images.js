#!/usr/bin/env node

/**
 * Script para generar imágenes de alimentos desde Unsplash
 * Identifica top 150 alimentos y busca fotos reales
 * Actualiza columna 'icon' en la BD con URLs de imagen
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mrabsfuwprxisgxfqnuy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_KEY o EXPO_PUBLIC_SUPABASE_ANON_KEY no configurada');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'hunterfit' },
});

// Alimentos prioritarios (comunes, populares)
const PRIORITY_FOODS = [
  'pollo', 'arroz', 'frijoles', 'huevo', 'tomate', 'cebolla',
  'leche', 'queso', 'pan', 'manzana', 'plátano', 'naranja',
  'papa', 'zanahoria', 'lechuga', 'brócoli', 'atún', 'salmón',
  'pechuga', 'res', 'cerdo', 'aguacate', 'yogur', 'avena',
  'jamón', 'mantequilla', 'aceite', 'ajo', 'cilantro', 'limón',
];

function generateUnsplashUrl(foodName) {
  // Estrategia: buscar foto genérica por categoría de alimento
  const cleanName = foodName.toLowerCase().split(' ')[0]; // Primera palabra

  // Unsplash source endpoint (sin necesidad de API key)
  // Format: https://source.unsplash.com/featured/?<search>
  return `https://source.unsplash.com/featured/?${cleanName},food&w=400&h=400&fit=crop`;
}

async function main() {
  console.log('🔄 Iniciando generación de imágenes de alimentos...\n');

  try {
    // 1. Traer todos los alimentos
    console.log('📥 Trayendo alimentos de la BD...');
    const { data: foods, error: fetchError } = await supabase
      .from('foods')
      .select('id, name_es, category, icon')
      .limit(500);

    if (fetchError) throw fetchError;
    console.log(`✅ ${foods.length} alimentos encontrados\n`);

    // 2. Filtrar siguientes 350 alimentos (151-500)
    const topFoods = foods
      .sort((a, b) => {
        const aPriority = PRIORITY_FOODS.some(p => a.name_es.toLowerCase().includes(p)) ? 1 : 0;
        const bPriority = PRIORITY_FOODS.some(p => b.name_es.toLowerCase().includes(p)) ? 1 : 0;
        return bPriority - aPriority;
      })
      .slice(150, 500);

    console.log(`🎯 Siguientes 350 alimentos seleccionados (${topFoods.length})\n`);

    // 3. Generar URLs de imagen
    console.log('🖼️  Generando URLs de Unsplash...');
    const updates = topFoods.map(food => ({
      id: food.id,
      imageUrl: generateUnsplashUrl(food.name_es),
    }));

    console.log(`✅ ${updates.length} URLs generadas\n`);

    // 4. Actualizar BD en lotes
    console.log('💾 Actualizando BD...');
    const batchSize = 50;
    let updated = 0;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      for (const update of batch) {
        const { error: updateError } = await supabase
          .from('foods')
          .update({ icon: update.imageUrl })
          .eq('id', update.id);

        if (updateError) {
          console.warn(`⚠️ Error actualizando ${update.id}:`, updateError.message);
        } else {
          updated++;
        }
      }

      console.log(`  Progreso: ${updated}/${updates.length}`);
    }

    console.log(`\n✅ ÉXITO: ${updated}/${updates.length} alimentos actualizados con imágenes`);
    console.log('\n📸 Las imágenes se cargarán desde Unsplash en tiempo real');
    console.log('⏱️  Primera carga puede tardar 2-3s por imagen (después cachean)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
