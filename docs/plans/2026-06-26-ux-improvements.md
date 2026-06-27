# HunterFit — 8 Mejoras UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Pulir la UX de las 4 tabs (Home, Nutrición, Entrena, Perfil) con buscador search-first, anillo unificado, iconos consistentes, progreso semanal, misiones fusionadas, estados vacíos y skeletons.

**Architecture:** Cambios quirúrgicos por pantalla reutilizando componentes existentes (`CalorieRing`, `EmptyState`, `MenuList`, `RecipeSkeleton`). Se crean 2 componentes nuevos pequeños (`ListSkeleton`, `SegmentedTabs`) y 1 hook (`useRecentFoods`). Sin migraciones de BD.

**Tech Stack:** Expo SDK 56, React Native, Expo Router, React Query, Zustand, Ionicons, react-native-svg.

---

## Context

Tras pulir nutrición y crear `MenuList`, quedan 8 mejoras de UX detectadas revisando las 4 tabs:

- El buscador de alimentos vuelca 50 "Populares" alfabéticos (todos los "Aceite de…") en vez de priorizar recientes/favoritos como Fitia.
- Hay **dos** anillos de calorías: `CalorieRing` (SVG, pulido, en Home) y uno casero pobre en Nutrición.
- Mezcla de emojis (🍽️💪📊) e Ionicons como iconografía.
- Entrena no muestra progreso semanal ("Día 2 de 4").
- Home tiene misiones diarias y semanales como 2 secciones casi idénticas.
- Estados vacíos inconsistentes (algunos texto plano, otros `EmptyState`).
- No hay skeletons en listas (solo en RecipeAI).

Componentes/archivos clave ya existentes:
- `src/components/CalorieRing.tsx` — anillo SVG bueno (props: `consumed`, `target`, `size`)
- `src/components/EmptyState.tsx` + `src/lib/emptyState.ts` — estados vacíos con icono/título/subtítulo
- `src/components/MenuList.tsx` — filas de menú agrupadas
- `src/components/RecipeSkeleton.tsx` — patrón de skeleton con Reanimated
- `src/hooks/useData.ts` — hooks de datos (React Query)
- `src/app/(tabs)/{home,nutrition,workouts,profile}.tsx`
- `src/app/nutrition/search.tsx`

---

## Task 1: Anillo de calorías unificado (Nutrición usa `CalorieRing`)

**Files:**
- Modify: `src/app/(tabs)/nutrition.tsx`

**Paso 1: Importar CalorieRing**

```tsx
import { CalorieRing } from '../../components/CalorieRing';
```

**Paso 2: Reemplazar el anillo casero**

Localizar el bloque `{/* Hero: calorías */}` con `styles.ringWrap`/`ringOuter`/`ringInner` y reemplazar el `<View style={styles.kcalRow}>...</View>` interno por:

```tsx
<View style={styles.kcalRow}>
  <CalorieRing consumed={totals.kcal} target={targets.kcal} size={120} />
  <View style={{ flex: 1, gap: 8 }}>
    <InfoKcal label="Meta" value={`${targets.kcal} kcal`} />
    <InfoKcal label="Restante" value={`${remaining} kcal`} accent={remaining < 200 ? colors.success : colors.text} />
    <ProgressBar progress={kcalPct} height={6} />
  </View>
</View>
```

**Paso 3: Borrar estilos muertos**

Eliminar de `styles`: `ringWrap`, `ringOuter`, `ringInner`, `ringKcal`, `ringLabel` (ya no se usan).

**Verificación:** Abrir Nutrición → el anillo se ve idéntico al de Home (SVG con gradiente y "X restantes"). `npx tsc --noEmit` sin errores nuevos.

---

## Task 2: Hook `useRecentFoods` (alimentos usados recientemente)

**Files:**
- Modify: `src/hooks/useData.ts`

**Paso 1: Agregar el hook al final de useData.ts**

Deriva los alimentos recientes desde `meal_logs` (los food_id más recientes del usuario, únicos), y trae sus datos de `foods`:

```typescript
export function useRecentFoods(userId: string | null) {
  return useQuery({
    queryKey: ['recent-foods', userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Food[]> => {
      const { data: logs, error } = await supabase
        .from('meal_logs')
        .select('food_id, created_at')
        .eq('user_id', userId!)
        .not('food_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      // IDs únicos preservando orden (más reciente primero)
      const seen = new Set<number>();
      const ids: number[] = [];
      for (const l of logs ?? []) {
        if (l.food_id != null && !seen.has(l.food_id)) {
          seen.add(l.food_id);
          ids.push(l.food_id);
        }
        if (ids.length >= 8) break;
      }
      if (ids.length === 0) return [];
      const { data: foods, error: e2 } = await supabase
        .from('foods').select('*').in('id', ids);
      if (e2) throw e2;
      // Reordenar según el orden de ids (recientes primero)
      const byId = new Map((foods ?? []).map((f: any) => [f.id, f]));
      return ids.map(id => byId.get(id)).filter(Boolean) as Food[];
    },
  });
}
```

**Verificación:** No hay UI aún; se valida en Task 3. `npx tsc --noEmit` limpio.

---

## Task 3: Buscador search-first (Recientes + Favoritos antes de Populares)

**Files:**
- Modify: `src/app/nutrition/search.tsx`

**Paso 1: Importar el hook**

```tsx
import { ..., useRecentFoods } from '../../hooks/useData';
```

**Paso 2: Usar el hook (no demo)**

```tsx
const { data: recentFoods = [] } = useRecentFoods(isDemo ? null : userId);
```

**Paso 3: Mostrar sección "Recientes" cuando no hay búsqueda ni categoría**

Justo antes del panel de resultados/Populares, agregar (solo si `searchTerm.length < 2 && selectedCategory === 'all' && recentFoods.length > 0`):

```tsx
{searchTerm.length < 2 && selectedCategory === 'all' && recentFoods.length > 0 && (
  <SystemPanel style={styles.resultsPanel}>
    <SystemText dim style={styles.resultsLabel}>🕐 Recientes</SystemText>
    {recentFoods.map((item) => (
      <Pressable
        key={`recent-${item.id}`}
        style={styles.foodRow}
        onPress={() => { setSelectedFood(item); setQuantity(item.serving_g.toString()); }}
      >
        <SystemText style={{ fontSize: 22 }}>{(item as any).icon ?? '🍽️'}</SystemText>
        <View style={{ flex: 1 }}>
          <SystemText style={styles.foodName}>{item.name_es}</SystemText>
          <SystemText dim style={styles.foodMeta}>{item.kcal} kcal · porción {item.serving_g}g</SystemText>
        </View>
        <SystemText style={{ color: colors.glow, fontSize: 18 }}>›</SystemText>
      </Pressable>
    ))}
  </SystemPanel>
)}
```

**Paso 4: Cambiar el label del panel de Populares**

En el panel actual, el label dice "Populares" cuando no hay búsqueda. Mantenerlo pero solo mostrar Populares debajo de Recientes (ya funciona porque son paneles separados). Opcional: cambiar a "Sugeridos".

**Verificación:** Registrar 2-3 comidas → volver a `/nutrition/search` → arriba aparece "🕐 Recientes" con esos alimentos. En cuenta nueva sin historial, no aparece la sección.

---

## Task 4: Ordenar "Populares" por uso (no alfabético)

**Files:**
- Modify: `src/hooks/useData.ts`

**Problema:** `useDefaultFoods` ordena por `name_es` → se amontonan los "Aceite de…". 

**Paso 1: Crear/usar una columna de orden simple**

Sin columna de popularidad, ordenar por `id` (los primeros seed suelen ser los más comunes) en vez de alfabético, para el caso `category === 'all'`:

```typescript
// dentro de useDefaultFoods, cuando category === 'all':
const { data, error } = await q.order('id', { ascending: true }).limit(limit);
```

Mantener `order('name_es')` solo cuando hay categoría seleccionada (ahí sí conviene alfabético dentro de la subcategoría).

```typescript
let query = q;
query = (category && category !== 'all')
  ? query.order('name_es')
  : query.order('id', { ascending: true });
const { data, error } = await query.limit(limit);
```

**Verificación:** Abrir `/nutrition/search` sin categoría → la lista ya NO empieza con 6 aceites seguidos; muestra variedad.

---

## Task 5: Iconos consistentes (Ionicons en Home QuickActions)

**Files:**
- Modify: `src/app/(tabs)/home.tsx`

**Paso 1: Importar Ionicons**

```tsx
import { Ionicons } from '@expo/vector-icons';
```

**Paso 2: Cambiar `QuickAction` para aceptar nombre de Ionicon**

Reemplazar la firma y render del icono en el sub-componente `QuickAction`:

```tsx
function QuickAction({ icon, label, onPress, gradient }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; gradient?: boolean;
}) {
  // ...dentro del LinearGradient/View, reemplazar <Text style={qaStyles.icon}>{icon}</Text> por:
  <Ionicons name={icon} size={22} color={gradient ? '#fff' : colors.glow} />
}
```

**Paso 3: Actualizar las 3 llamadas**

```tsx
<QuickAction icon="restaurant" label={"Registrar\ncomida"} ... gradient />
<QuickAction icon="barbell" label={nextRoutine ? ... : "Ver\nrutinas"} ... />
<QuickAction icon="stats-chart" label={"Mi\nprogreso"} ... />
```

**Paso 4: Borrar `qaStyles.icon`** (ya no se usa el emoji Text).

**Verificación:** Home → las 3 acciones rápidas muestran iconos Ionicon limpios en vez de emojis.

---

## Task 6: Barra "Día X de Y" en Entrena

**Files:**
- Modify: `src/app/(tabs)/workouts.tsx`

**Paso 1: Calcular días completados esta semana**

Usar el hook existente o derivar de `routines`. Si no hay dato de completados, mostrar progreso del plan (cuántas rutinas tiene). Añadir bajo el header (después del `GradientText`):

```tsx
{routines.length > 0 && (
  <View style={styles.weekProgress}>
    <View style={styles.weekBarTrack}>
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.weekBarFill, { width: `${(completedDays / routines.length) * 100}%` as any }]}
      />
    </View>
    <SystemText dim style={{ fontSize: 12 }}>
      {completedDays} de {routines.length} días esta semana
    </SystemText>
  </View>
)}
```

**Paso 2: Obtener `completedDays`**

Consultar sesiones de esta semana desde `workout_sets` o `routine_completions` (verificar qué tabla registra completados — `completeWorkout` en `services/routines.ts`). Agregar un hook simple `useWeekWorkouts(userId)` en `useData.ts` que cuente sesiones únicas de los últimos 7 días:

```typescript
export function useWeekWorkouts(userId: string | null) {
  return useQuery({
    queryKey: ['week-workouts', userId],
    enabled: !!userId,
    queryFn: async (): Promise<number> => {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const { data, error } = await supabase
        .from('workout_sets')
        .select('session_id, created_at')
        .eq('user_id', userId!)
        .gte('created_at', weekAgo.toISOString());
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.session_id)).size;
    },
  });
}
```

Usar en workouts.tsx: `const { data: completedDays = 0 } = useWeekWorkouts(isDemo ? null : userId);`

**Paso 3: Estilos**

```typescript
weekProgress: { gap: 6, marginTop: spacing.sm },
weekBarTrack: { height: 6, backgroundColor: colors.bgElevated, borderRadius: 3, overflow: 'hidden' },
weekBarFill: { height: '100%', borderRadius: 3 },
```

**Verificación:** Completar un entrenamiento → volver a Entrena → la barra muestra "1 de N días esta semana".

---

## Task 7: Fusionar misiones diarias + semanales con `SegmentedTabs`

**Files:**
- Create: `src/components/SegmentedTabs.tsx`
- Modify: `src/app/(tabs)/home.tsx`

**Paso 1: Crear componente SegmentedTabs**

`src/components/SegmentedTabs.tsx`:

```tsx
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/system';
import { SystemText } from './system';

export function SegmentedTabs<T extends string>({ options, value, onChange }: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map(opt => {
        const active = opt.key === value;
        return (
          <Pressable key={opt.key} onPress={() => onChange(opt.key)} style={[styles.tab, active && styles.tabActive]}>
            <SystemText style={[styles.label, { color: active ? colors.text : colors.textDim }]}>
              {opt.label}
            </SystemText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.bgElevated, borderRadius: radius.pill, padding: 3, gap: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelBorder },
  label: { fontSize: 13, fontWeight: '700' },
});
```

**Paso 2: Estado en home.tsx**

```tsx
const [questTab, setQuestTab] = useState<'daily' | 'weekly'>('daily');
```

**Paso 3: Fusionar las dos secciones de misiones (5 y 6)**

Reemplazar los dos bloques `{activeQuests.length > 0 && (...)}` y `{activeWeeklyQuests.length > 0 && (...)}` por una sola sección con tabs:

```tsx
{(activeQuests.length > 0 || activeWeeklyQuests.length > 0) && (
  <Animated.View entering={FadeInDown.delay(340).springify()}>
    <View style={styles.section}>
      <SegmentedTabs
        value={questTab}
        onChange={setQuestTab}
        options={[
          { key: 'daily', label: `⚔️ Hoy (${activeQuests.length})` },
          { key: 'weekly', label: `📅 Semana (${activeWeeklyQuests.length})` },
        ]}
      />
      <View style={{ marginTop: spacing.sm }}>
        {(questTab === 'daily' ? activeQuests : activeWeeklyQuests).map((quest) => (
          // reutilizar el render de questRow existente (con barra si es semanal)
        ))}
        {(questTab === 'daily' ? activeQuests : activeWeeklyQuests).length === 0 && (
          <SystemText dim style={{ fontSize: 13, textAlign: 'center', paddingVertical: spacing.md }}>
            {questTab === 'daily' ? 'Sin misiones de hoy' : 'Sin misiones semanales'}
          </SystemText>
        )}
      </View>
    </View>
  </Animated.View>
)}
```

Mantener el render de filas existente (diaria simple, semanal con barra de progreso).

**Verificación:** Home → una sola tarjeta de misiones con toggle "Hoy / Semana"; cambia el contenido al tocar.

---

## Task 8: Estados vacíos consistentes (`EmptyState`)

**Files:**
- Modify: `src/lib/emptyState.ts` (agregar entradas faltantes)
- Modify: `src/app/(tabs)/nutrition.tsx`, `src/app/(tabs)/home.tsx`

**Paso 1: Agregar estados faltantes en emptyState.ts**

```typescript
recipes: {
  icon: '✨',
  title: 'Sin recetas aún',
  subtitle: 'Genera tu primera receta con IA según tus macros',
},
recentFoods: {
  icon: '🕐',
  title: 'Sin alimentos recientes',
  subtitle: 'Los alimentos que registres aparecerán aquí',
},
```

**Paso 2: Usar EmptyState en las comidas vacías de Nutrición**

En `nutrition.tsx`, donde cada `mealSection` muestra `<Text style={styles.emptyMeal}>Sin registros</Text>`, dejarlo (es inline por sección, ok). Pero el empty global de la pantalla (cuando no hay NADA) ya usa lógica propia — verificar consistencia visual.

**Paso 3: Verificar Home empty meals**

El bloque `meals.length === 0` en home.tsx usa un Pressable custom — está bien, es un CTA. Dejar pero unificar copy.

**Verificación:** Las pantallas sin datos muestran el mismo estilo de estado vacío (icono + título + subtítulo).

---

## Task 9: Skeleton loaders en listas (`ListSkeleton`)

**Files:**
- Create: `src/components/ListSkeleton.tsx`
- Modify: `src/app/nutrition/search.tsx` (mientras carga búsqueda)

**Paso 1: Crear ListSkeleton reutilizable**

Basado en el patrón de `RecipeSkeleton.tsx`:

```tsx
import React from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

function Box({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  const o = useSharedValue(0.3);
  React.useEffect(() => {
    o.value = withRepeat(withSequence(withTiming(0.7, { duration: 700 }), withTiming(0.3, { duration: 700 })), -1, false);
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: '#ffffff15' }, s]} />;
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <View style={{ gap: 14, paddingVertical: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Box w={40} h={40} r={20} />
          <View style={{ flex: 1, gap: 6 }}>
            <Box w="55%" h={13} />
            <Box w="35%" h={11} />
          </View>
        </View>
      ))}
    </View>
  );
}
```

**Paso 2: Usar en search.tsx mientras carga búsqueda**

`useFoodSearch` expone `isLoading`. Capturarlo:

```tsx
const { data: searchResults = [], isLoading: searching } = useFoodSearch(searchTerm, selectedCategory);
```

Mostrar skeleton cuando `searchTerm.length >= 2 && searching`:

```tsx
{searchTerm.length >= 2 && searching ? (
  <SystemPanel><ListSkeleton rows={5} /></SystemPanel>
) : foods.length > 0 ? (
  // panel de resultados actual
) : ...}
```

**Verificación:** Buscar un alimento → durante la carga aparecen filas skeleton pulsando, luego resultados.

---

## Orden de implementación recomendado

1. **Task 1** (anillo unificado) — visible, aislado
2. **Task 4** (orden populares) — 2 líneas, gran impacto visual
3. **Task 2 + 3** (recientes) — el de más valor en nutrición
4. **Task 9** (ListSkeleton) — reutilizable
5. **Task 5** (iconos Home)
6. **Task 6** (progreso semanal Entrena)
7. **Task 7** (misiones fusionadas + SegmentedTabs)
8. **Task 8** (estados vacíos)

---

## Verification Final

1. `npx tsc --noEmit` → sin errores nuevos en archivos tocados
2. Nutrición: anillo SVG unificado, "Recientes" arriba, Populares variados (no alfabéticos)
3. Buscar alimento: skeleton mientras carga
4. Home: iconos Ionicon en acciones rápidas, misiones en una sola tarjeta con toggle Hoy/Semana
5. Entrena: barra "X de N días esta semana"
6. Estados vacíos consistentes en pantallas sin datos
7. Recargar `localhost:8081` y navegar las 4 tabs sin crashes
8. Commit por task (o por grupo) con mensajes claros
