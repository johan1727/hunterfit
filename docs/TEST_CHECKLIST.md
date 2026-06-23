# RecipeAI Test Checklist — TASK 6

**Objetivo:** Validar que RecipeAI genera recetas realistas con macros precisas, y que toda la UI/UX funciona correctamente.

**Fecha:** 2026-06-23  
**Testing Mode:** Manual E2E + Automated Script

---

## 1. Database State (Supabase)

Verificar que la tabla `hunterfit.foods` tiene datos completos.

- [ ] 5000+ alimentos en `hunterfit.foods`
- [ ] Todos los alimentos tienen valor `kcal` válido (> 0)
- [ ] Todos tienen `protein_g`, `carbs_g`, `fat_g` poblados
- [ ] Todos tienen `serving_g` (porción estándar)
- [ ] Categorías válidas: proteinas, cereales, verduras, frutas, lacteos, grasas, legumbres, etc.
- [ ] Ningún alimento tiene NULL en campos críticos

**Validar en Supabase console:**
```sql
SELECT COUNT(*) FROM hunterfit.foods;
SELECT * FROM hunterfit.foods LIMIT 5;
SELECT category, COUNT(*) FROM hunterfit.foods GROUP BY category;
```

---

## 2. RecipeAI Service (`src/services/recipeAI.ts`)

Pruebas automatizadas del servicio de generación.

- [ ] `generateRecipeWithGemini()` retorna `GeneratedRecipe` válido
- [ ] Respuesta incluye JSON parseable (maneja markdown blocks)
- [ ] Macros calculados correctamente desde foods de la BD
- [ ] `totalKcal` = sum of all foods kcal
- [ ] `totalProtein` = sum of all foods protein_g
- [ ] `macroPercentages` suma a 100%
- [ ] `recipe.id` es único (timestamp-based: `recipe_${Date.now()}`)
- [ ] `recipe.title` y `description` son strings no-vacíos
- [ ] `recipe.foods` tiene 3-7 alimentos
- [ ] `recipe.prepTime` está en rango [5, 60] minutos
- [ ] `recipe.difficulty` es 'fácil' | 'moderado' | 'difícil'
- [ ] `recipe.steps` es array con 3-8 pasos de cocción

**Run automated test:**
```bash
cd d:\TODO\app\ fitnes\hunterfit
npx ts-node test/recipeai.test.ts
```

Expected output: ✅ All tests passed

---

## 3. useRecipeAI Hook (`src/hooks/useRecipeAI.ts`)

Validación del hook de React Query.

- [ ] Hook fetches `foods` from Supabase on first call
- [ ] Foods cached en React Query con `staleTime: 60 * 60 * 1000` (1 hour)
- [ ] `generateRecipe()` mutation funciona correctamente
- [ ] `generateMultiple(3)` genera 3 recetas secuencialmente
- [ ] Rate limiting: 500ms delay entre llamadas a Gemini
- [ ] `isGenerating` state cambia a true/false correctamente
- [ ] `error` es null cuando no hay error, contiene error mensaje cuando falla
- [ ] Retry logic: si una receta falla, continúa con la siguiente

---

## 4. Favorite Recipes Store (`src/lib/favoriteRecipesStore.ts`)

Validación del estado de favoritos con Zustand.

- [ ] `useFavoriteRecipes.addFavorite(recipe)` agrega receta al store
- [ ] `useFavoriteRecipes.removeFavorite(recipeId)` elimina receta
- [ ] `useFavoriteRecipes.isFavorited(recipeId)` retorna boolean correcto
- [ ] No hay duplicados: `addFavorite()` rechaza si ya existe
- [ ] `useFavoriteRecipes.getFavorites()` retorna copia del array
- [ ] Store persiste entre renders
- [ ] Datos en memoria (sin persistencia a disco en esta versión)

**Manual test:**
```javascript
// En browser console después de navigate a recipe screen
const { addFavorite, isFavorited, getFavorites } = useFavoriteRecipes.getState();
addFavorite(recipe);
console.log(isFavorited(recipe.id)); // true
console.log(getFavorites().length); // 1
removeFavorite(recipe.id);
console.log(isFavorited(recipe.id)); // false
```

---

## 5. RecipeScreen UI (`src/app/nutrition/recipe.tsx`)

Validación de la interfaz de usuario.

### Navigation & Layout
- [ ] Pantalla accesible desde `/nutrition/recipe`
- [ ] Header con título "RecipeAI" y botón back
- [ ] ScrollView con contenido dinámico
- [ ] SafeAreaView respeta área segura (notches, home indicators)

### Meal Type Selector
- [ ] 4 botones: Desayuno, Almuerzo, Cena, Snack
- [ ] Botón activo tiene borde gradiente (azul)
- [ ] Cambiar meal type resetea `selectedRecipeIndex` a 0
- [ ] Cambiar meal type actualiza `mealMacros` correctamente

### Generate Button
- [ ] Texto: "Generar Recetas" (idle) o "Generando..." (loading)
- [ ] Disabled durante generación
- [ ] Gradient variant (azul-violeta-rosa)
- [ ] Pressing genera 3 recetas (toma 4-6s aproximadamente)
- [ ] Muestra alerta "Error" si no está autenticado

### Recipe Carousel
- [ ] Muestra hasta 3 recipe cards
- [ ] Cada card muestra: título, kcal, tiempo prep
- [ ] Card activo tiene borde gradiente más grueso
- [ ] Tapping card cambia `selectedRecipeIndex`
- [ ] Carousel es horizontal scrollable

### Selected Recipe Details
- [ ] **Description Panel:** descripción de 1-2 líneas
- [ ] **Macro Breakdown:**
  - [ ] 3 columnas: Proteína (rojo), Carbos (turquesa), Grasas (amarillo)
  - [ ] Porcentaje grande y bold
  - [ ] Gramos debajo en texto dim
- [ ] **Ingredients List:**
  - [ ] Cada ingrediente con emoji/icon
  - [ ] Nombre en español
  - [ ] Gramos y calorías
  - [ ] Gap vertical entre items
- [ ] **Cooking Steps:**
  - [ ] Número correlativo (1. 2. 3. etc)
  - [ ] Paso en texto normal
  - [ ] Tiempo de prep en header

### Action Buttons
- [ ] **Favorito button:**
  - [ ] Si `isFavorited(recipe.id)`: "❤️ Favorito" (filled)
  - [ ] Si no: "🤍 Favorito" (outline)
  - [ ] Press: toggle + alert "Receta guardada en favoritos"
  - [ ] Stores en `useFavoriteRecipes`
- [ ] **Registrar Comida button:**
  - [ ] Press: insert a `meal_logs` en Supabase
  - [ ] Alert: "Comida registrada"
  - [ ] Router navega back a `/nutrition`
  - [ ] Si falla: alert "Error: No se pudo registrar"

### Error Handling
- [ ] Si Gemini API key falta: error panel "EXPO_PUBLIC_GEMINI_API_KEY no está configurada"
- [ ] Si Supabase foods vacío: error "No hay alimentos disponibles en la base de datos"
- [ ] Error durante generación: muestra en red panel
- [ ] Error durante logging: alerta modal

---

## 6. User Journey (Full E2E)

**Setup:** User auth + app abierta

1. [ ] Open app → Navigate to Nutrition tab (home or bottom nav)
2. [ ] Tap "🤖 Generar Receta con IA" button (or similar text)
3. [ ] Directed to `/nutrition/recipe` screen
4. [ ] **Meal type selector visible:** 4 buttons
5. [ ] **Default meal type:** Almuerzo (700 kcal, 60g prot, etc)
6. [ ] Tap "Desayuno" button
   - [ ] Macros change to breakfast values (500 kcal, 40g prot, etc)
   - [ ] Selected recipe index resets
7. [ ] Tap "Generar Recetas" button
   - [ ] Button text changes to "Generando..."
   - [ ] Button disabled
   - [ ] Wait 4-6 seconds
   - [ ] 3 recipe cards appear in carousel
8. [ ] **Inspect first recipe:**
   - [ ] Title, kcal, prep time visible
   - [ ] Card has gradient border
9. [ ] Tap second recipe card
   - [ ] Details panel updates below
   - [ ] New description, ingredients, steps shown
   - [ ] Macro breakdown for new recipe
10. [ ] **Review ingredients:**
    - [ ] All foods have emoji icons
    - [ ] Quantities in grams
    - [ ] Calories add up to total
11. [ ] **Review cooking steps:**
    - [ ] 3-8 pasos numerados
    - [ ] Each step is clear instruction
    - [ ] Prep time matches header
12. [ ] Tap "🤍 Favorito" button
    - [ ] Button changes to "❤️ Favorito"
    - [ ] Alert: "Receta guardada en favoritos"
13. [ ] Tap "Registrar Comida" button
    - [ ] Alert: "Comida registrada"
    - [ ] Auto-redirected to `/nutrition` (or home)
14. [ ] **Navigate back to recipe screen**
    - [ ] Favorite button still shows "❤️" (persistent in Zustand)
15. [ ] **Check Supabase:**
    - [ ] `meal_logs` table has new entry
    - [ ] `user_id`, `recipe_id`, `meal_type`, macros populated

---

## 7. Data Integrity Checks

### Macro Accuracy
- [ ] Single recipe: macros within ±15% of target
- [ ] Multiple recipes: each recipe within ±15%
- [ ] totalKcal = sum of food kcals
- [ ] Macro percentages sum to 100% (protein 4 kcal/g, carbs 4 kcal/g, fat 9 kcal/g)

### Food Selection
- [ ] All foods in recipe are from database (no invented foods)
- [ ] Food quantities match what Gemini specified
- [ ] Food icons present (currently hardcoded as 🍽️, can be enhanced)

### Meal Logging
- [ ] `meal_logs` insert succeeds
- [ ] Fields match recipe data:
  - [ ] `recipe_id` = recipe.id
  - [ ] `recipe_title` = recipe.title
  - [ ] `meal_type` = selected meal type
  - [ ] `total_kcal`, `total_protein_g`, `total_carbs_g`, `total_fat_g` match recipe

---

## 8. Performance Validation

### Generation Speed
- [ ] Single recipe: 1-2 seconds (Gemini API)
- [ ] 3 recipes (sequential): 4-6 seconds total
- [ ] No UI freezing during generation
- [ ] Smooth button state transitions

### Memory & Rendering
- [ ] No crashes when generating multiple recipes
- [ ] Foods cached in React Query (verified in DevTools)
- [ ] RecipeScreen re-renders only when state changes
- [ ] No infinite loops or memory leaks

### Network
- [ ] Successful API calls to Gemini
- [ ] Successful inserts to Supabase
- [ ] Rate limiting respected (500ms between requests)

---

## 9. Error Scenarios

Test error handling:

- [ ] **Missing Gemini API key:** Error message displays in red panel
- [ ] **No foods in database:** Error "No hay alimentos disponibles"
- [ ] **Gemini API rate limit:** Error message shown, user can retry
- [ ] **Food not found in DB:** Error "Alimento no encontrado en BD: {name}"
- [ ] **Invalid JSON from Gemini:** Error with fallback UI
- [ ] **Supabase offline:** Error alert on meal logging
- [ ] **User not authenticated:** "Debes estar autenticado" alert on generate

---

## 10. Browser/DevTools Verification

Open React Native/Expo DevTools:

- [ ] No **red error boxes** (fatal errors)
- [ ] No **yellow warning boxes** (non-fatal warnings)
- [ ] **React Query DevTools:** Foods query cached
- [ ] **Network tab:** Gemini API calls succeed (200 status)
- [ ] **Network tab:** Supabase inserts succeed (POST meal_logs)
- [ ] **Console:** No error logs or warnings
- [ ] **Performance:** 60fps smooth scrolling in recipe details

---

## 11. UI Polish Checks

- [ ] Text colors match design system (dim vs normal)
- [ ] Icons sized appropriately
- [ ] Spacing consistent (padding, gap, margin)
- [ ] Gradients render smoothly (no banding)
- [ ] Borders crisp and aligned
- [ ] Typography hierarchy clear (font sizes, weights)
- [ ] Dark mode colors (Aurora background #07080B)
- [ ] SafeAreaView insets respected

---

## Sign-Off Checklist

Once all sections are completed:

- [ ] All 11 test categories passed
- [ ] No critical bugs found
- [ ] No warnings in console
- [ ] Full user journey works start-to-end
- [ ] Data correctly persisted to Supabase
- [ ] Performance acceptable (4-6s for 3 recipes)
- [ ] Ready for production release

---

## Test Environment

**OS:** Windows 10 / macOS / Linux  
**Device:** iOS Simulator / Android Emulator / Physical Device  
**Expo Version:** 56.0.9  
**React Native:** 0.85.3  
**Gemini API:** Available and configured  
**Supabase:** Project "MY EX", schema "hunterfit"

---

## Notes for QA

1. **Gemini API Rate Limits:** May hit rate limits if generating many recipes rapidly. Wait between tests.
2. **Macro Tolerance:** ±15% is realistic given database food variety and Gemini interpretation.
3. **Food Icons:** Currently hardcoded as 🍽️. Consider mapping by category in future iteration.
4. **Meal Type Defaults:** Defined in `MEAL_MACROS` constant in recipe screen.
5. **Favorite Persistence:** In-memory only (Zustand). Will clear on app restart. Consider adding Zustand persist middleware if permanent storage needed.
6. **Recipe ID:** Format `recipe_${Date.now()}`. Unique per generation. Consider UUID in production.

---

**Test Runner:** QA Engineer  
**Date Completed:** ___________  
**Pass/Fail:** ___________  
**Notes:** ___________________________________________________________________
