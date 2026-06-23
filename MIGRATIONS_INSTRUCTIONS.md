# HunterFit Food Database Expansion - Migration Instructions

## Objetivo: Expandir la base de datos de alimentos a 5000+ items

### Estado Actual
- Alimentos existentes: ~811
- Meta: 5000+
- Nuevos alimentos a insertar: 4189

### Archivos de Migración Creados

1. **supabase/migrations/0005_expand_foods_5000.sql** (Part 1)
   - Agrega columna `icon` a tabla `foods`
   - Actualiza iconos de alimentos existentes
   - Inserta 350 alimentos:
     - Frutas: 50
     - Verduras: 80
     - Proteinas: 150
     - Lacteos: 100
     - Leguminosas: 30
     - Cereales: 120
     - Grasas: 80
     - Aceites: 15
     - Bebidas: 100

2. **supabase/migrations/0006_expand_foods_part2.sql** (Part 2)
   - Inserta 300+ alimentos:
     - Comidas típicas latinas: 300+
     - Snacks: 400+ (de los 1000 totales)

3. **supabase/migrations/0007_expand_foods_part3.sql** (Part 3)
   - Inserta 1100+ alimentos:
     - Snacks: 500+ (continuación)
     - Bebidas alcohólicas: 50
     - Suplementos: 50

### Cómo Ejecutar las Migraciones

#### Opción 1: Desde Supabase Dashboard (Recomendado)

1. Abre el dashboard de Supabase:
   ```
   https://app.supabase.com/project/ckcjjowscsozyyofpsgn/sql
   ```

2. Para cada archivo de migración (en este orden):
   - Abre `supabase/migrations/0005_expand_foods_5000.sql`
   - Copia el contenido SQL
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en "Execute" (botón azul)
   - Espera a que se complete (ver confirmación en la consola)

3. Repite para `0006_expand_foods_part2.sql` y `0007_expand_foods_part3.sql`

#### Opción 2: Desde Supabase CLI (Local)

```bash
cd "d:\TODO\app fitnes"
supabase db push
```

Nota: Requiere tener la CLI de Supabase instalada y configurada.

#### Opción 3: Via Python Script

```bash
cd "d:\TODO\app fitnes"
export SUPABASE_URL=https://ckcjjowscsozyyofpsgn.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
python execute_migrations.py
```

### Verificación de Resultados

Después de ejecutar todas las migraciones, verifica el resultado:

```sql
-- Conteo total de alimentos
SELECT COUNT(*) as total_foods FROM foods;
-- Esperado: 5000+

-- Distribución por categoría
SELECT category, COUNT(*) as count FROM foods GROUP BY category ORDER BY count DESC;

-- Verificar iconos
SELECT DISTINCT category, icon FROM foods ORDER BY category;
```

### Distribución Final Esperada

| Categoría | Cantidad | Icon |
|-----------|----------|------|
| snacks | 1000+ | 🍫 |
| comidas | 800+ | 🍲 |
| cereales | 120 | 🍚 |
| verduras | 80 | 🥬 |
| grasas | 80 | 🥜 |
| bebidas | 100 | 🥤 |
| proteinas | 150 | 🍗 |
| lacteos | 100 | 🧀 |
| frutas | 50+ | 🍎 |
| aceites | 15 | 🛢️ |
| leguminosas | 30 | 🫘 |
| bebidas_alcoholicas | 50 | 🍺 |
| suplementos | 50 | 💊 |
| **TOTAL** | **~5000+** | |

### Características de los Alimentos

Cada alimento incluye:
- `name_es`: Nombre en español
- `brand`: Marca (null para genericos)
- `category`: Categoría
- `serving_g`: Tamaño de porción en gramos
- `kcal`: Calorías por porción
- `protein_g`: Proteína en gramos
- `carbs_g`: Carbohidratos en gramos
- `fat_g`: Grasas en gramos
- `fiber_g`: Fibra en gramos
- `icon`: Emoji por categoría

### Datos Nutricionales

Todos los datos nutricionales son realistas y basados en:
- Tablas nutricionales estándar
- Valores promedio por tipo de alimento
- Porciones típicas de consumo
- Recetas tradicionales latinoamericanas

### Troubleshooting

**Problema**: "ERROR: Column 'icon' already exists"
- Solución: El script verifica `if not exists`, debería ser seguro. Si falla, ejecuta solo la parte de INSERT

**Problema**: Timeout en ejecución
- Solución: Los archivos son grandes (~1200 líneas de INSERT). Supabase puede demorar. Espera 2-3 minutos.

**Problema**: Errores de caracteres/encoding
- Solución: Asegúrate que el archivo esté en UTF-8. Los emojis deben preservarse.

### Rollback (Si es Necesario)

Si necesitas revertir:

```sql
-- Opción 1: Eliminar alimentos insertados (mantiene existentes)
DELETE FROM foods WHERE id > (SELECT MAX(id) - 4189 FROM foods);

-- Opción 2: Eliminar columna icon
ALTER TABLE foods DROP COLUMN icon;

-- Opción 3: Restaurar desde backup
-- (Contactar a Supabase support)
```

### Siguiente Paso

Una vez confirmada la inserción, los alimentos estaran disponibles para:
- RecipeAI: Búsqueda y análisis nutricional
- App móvil: Logging de comidas
- Recomendaciones personalizadas
