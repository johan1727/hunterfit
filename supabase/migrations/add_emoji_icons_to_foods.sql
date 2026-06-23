-- TASK 2: Add category-specific emoji icons to 687 foods from expand_foods_1500.sql
-- Replace generic fork-and-knife emoji (🍽️) with category-specific emojis

-- Fruits
UPDATE hunterfit.foods SET icon = '🍎'
WHERE (category = 'frutas' OR category = 'fruta' OR category = 'fruit')
  AND icon = '🍽️';

-- Vegetables
UPDATE hunterfit.foods SET icon = '🥬'
WHERE (category = 'verduras' OR category = 'verdura' OR category = 'veggie')
  AND icon = '🍽️';

-- Proteins
UPDATE hunterfit.foods SET icon = '🍗'
WHERE (category = 'proteinas' OR category = 'proteina' OR category = 'protein')
  AND icon = '🍽️';

-- Dairy
UPDATE hunterfit.foods SET icon = '🧀'
WHERE (category = 'lacteos' OR category = 'lacteo' OR category = 'dairy')
  AND icon = '🍽️';

-- Legumes
UPDATE hunterfit.foods SET icon = '🫘'
WHERE (category = 'leguminosas' OR category = 'leguminosa' OR category = 'legume')
  AND icon = '🍽️';

-- Cereals & Carbs
UPDATE hunterfit.foods SET icon = '🍚'
WHERE (category = 'cereales' OR category = 'cereal' OR category = 'carb')
  AND icon = '🍽️';

-- Fats & Oils
UPDATE hunterfit.foods SET icon = '🥜'
WHERE (category = 'grasas' OR category = 'grasa' OR category = 'fat')
  AND icon = '🍽️';

-- Beverages
UPDATE hunterfit.foods SET icon = '🥤'
WHERE (category = 'bebidas' OR category = 'bebida')
  AND icon = '🍽️';

-- Meals & Dishes
UPDATE hunterfit.foods SET icon = '🍲'
WHERE (category = 'comidas' OR category = 'platillo')
  AND icon = '🍽️';

-- Snacks & Sweets
UPDATE hunterfit.foods SET icon = '🍫'
WHERE category = 'snacks'
  AND icon = '🍽️';

-- Verification: ensure all foods have icons and no nulls remain
-- SELECT icon, COUNT(*) FROM hunterfit.foods GROUP BY icon ORDER BY count DESC;
-- SELECT COUNT(*) as null_count FROM hunterfit.foods WHERE icon IS NULL;
