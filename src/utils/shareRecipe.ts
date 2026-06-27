import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import type { GeneratedRecipe } from '../services/recipeAI';

export async function shareRecipe(recipe: GeneratedRecipe): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    alert('Compartir no está disponible en este dispositivo');
    return;
  }

  const text = `🍽️ ${recipe.title}

📊 Macros: ${recipe.totalKcal} kcal | ${recipe.totalProtein}g prot | ${recipe.totalCarbs}g carbos | ${recipe.totalFat}g grasa

🧑‍🍳 Ingredientes:
${recipe.foods.map(f => `• ${f.name_es}: ${f.quantity_g}g`).join('\n')}

👨‍🍳 Preparación:
${recipe.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

⏱️ Tiempo: ${recipe.prepTime} min | Dificultad: ${recipe.difficulty}

Generado con HunterFit 🎯`;

  const file = new File(Paths.cache, 'hunterfit_receta.txt');
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/plain',
    dialogTitle: recipe.title,
  });
}
