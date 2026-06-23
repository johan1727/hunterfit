# HunterFit — Plan de Features Completo

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Llevar HunterFit a paridad con Fitia en tracking de nutrición, más los diferenciadores RPG únicos.

**Architecture:** Cada feature agrega tablas en el schema `hunterfit` de Supabase + hook React Query + UI con el design system Aurora existente. Nunca tocar el schema `public` (proyecto compartido "MY EX").

**Tech Stack:** Expo SDK 56, Expo Router v3, Supabase (`mrabsfuwprxisgxfqnuy`, schema `hunterfit`), React Query, Reanimated v4, Aurora design system (`src/theme/system.ts` + `src/components/system.tsx`)

**Design system clave:**
- Paneles: `SystemPanel` / `SystemWindowPanel`
- Texto: `GradientText` (títulos hero), `SystemText` (cuerpo), `SystemText dim` (secundario)
- Botones: `SystemButton variant="gradient|ghost|danger"`
- Input: `SystemInput`
- Colores: `colors.bg=#07080B`, `colors.glow=#5B7CFF`, `gradients.brand=['#5B7CFF','#C084FC','#FB7185']`
- Animaciones: `FadeInDown.delay(n).springify()` en entradas

---

## FASE 1 — Quick Wins (1–2h cada uno)

---

### Task 1: Registro de Agua 💧

**Por qué primero:** Feature más pedida en apps de nutrición, visualmente impactante, base de datos simple.

**Files:**
- Create DB: migración en Supabase (via MCP)
- Modify: `src/app/(tabs)/nutrition.tsx` — agregar sección de agua
- Modify: `src/hooks/useData.ts` — agregar `useWaterLog`, `useAddWater`

**Step 1: Crear tabla en Supabase**

Via Supabase MCP (`mcp__claude_ai_Supabase__execute_sql`):
```sql
CREATE TABLE IF NOT EXISTS hunterfit.water_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  date date NOT NULL DEFAULT current_date,
  ml integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hunterfit.water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own water" ON hunterfit.water_logs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Vista diaria agregada (útil para queries)
CREATE OR REPLACE VIEW hunterfit.water_daily AS
  SELECT user_id, date, SUM(ml) as total_ml
  FROM hunterfit.water_logs
  GROUP BY user_id, date;
```

**Step 2: Agregar hooks en `src/hooks/useData.ts`**

```ts
export function useWaterToday(userId: string | null) {
  const today = localDateString();
  return useQuery({
    queryKey: ['water', userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('water_logs')
        .select('ml')
        .eq('user_id', userId!)
        .eq('date', today);
      return (data ?? []).reduce((s, r) => s + r.ml, 0); // total en ml
    },
  });
}

export function useAddWater(userId: string | null) {
  const qc = useQueryClient();
  const today = localDateString();
  return useMutation({
    mutationFn: async (ml: number) => {
      const { error } = await supabase.from('water_logs').insert({ user_id: userId!, ml });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['water', userId, today] }),
  });
}
```

**Step 3: UI en `src/app/(tabs)/nutrition.tsx`**

Agregar después del panel de macros (antes de las secciones de comidas):

```tsx
{/* Agua */}
<Animated.View entering={FadeInDown.delay(200).springify()}>
  <WaterPanel userId={userId} isDemo={isDemo} />
</Animated.View>
```

Componente `WaterPanel` (en el mismo archivo o en `src/components/WaterPanel.tsx`):
```tsx
function WaterPanel({ userId, isDemo }: { userId: string | null; isDemo: boolean }) {
  const { data: totalMl = 0 } = useWaterToday(isDemo ? null : userId);
  const addWater = useAddWater(isDemo ? null : userId);
  const TARGET_ML = 2500;
  const pct = Math.min(1, totalMl / TARGET_ML);
  const liters = (totalMl / 1000).toFixed(1);
  const SIZES = [150, 250, 350, 500]; // ml por botón

  return (
    <SystemPanel>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SystemText style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint }}>
          Agua
        </SystemText>
        <SystemText style={{ color: colors.glow, fontWeight: '700' }}>
          {liters}L / {TARGET_ML / 1000}L
        </SystemText>
      </View>
      <ProgressBar progress={pct} color="#38BDF8" height={8} />
      {!isDemo && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {SIZES.map((ml) => (
            <Pressable
              key={ml}
              onPress={() => addWater.mutate(ml)}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 8,
                backgroundColor: '#38BDF820', borderRadius: radius.pill,
                borderWidth: 1, borderColor: '#38BDF840',
              }}
            >
              <SystemText style={{ color: '#38BDF8', fontSize: 12, fontWeight: '700' }}>
                +{ml}ml
              </SystemText>
            </Pressable>
          ))}
        </View>
      )}
    </SystemPanel>
  );
}
```

**Step 4: Añadir `useWaterToday` / `useAddWater` al import en nutrition.tsx**

**Verification:** Presionar botones de agua → barra sube → persiste al recargar.

---

### Task 2: Historial de Peso ⚖️

**Files:**
- Create DB: tabla `weight_logs` en Supabase
- Modify: `src/hooks/useData.ts` — `useWeightLogs`, `useLogWeight`
- Modify: `src/app/(tabs)/profile.tsx` — agregar sección peso con mini gráfica

**Step 1: Tabla en Supabase**

```sql
CREATE TABLE IF NOT EXISTS hunterfit.weight_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  date date NOT NULL DEFAULT current_date,
  weight_kg numeric(5,1) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hunterfit.weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weight" ON hunterfit.weight_logs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**Step 2: Hooks en `src/hooks/useData.ts`**

```ts
export function useWeightLogs(userId: string | null) {
  return useQuery({
    queryKey: ['weightLogs', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('date, weight_kg')
        .eq('user_id', userId!)
        .order('date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLogWeight(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weight_kg: number) => {
      const { error } = await supabase
        .from('weight_logs')
        .upsert({ user_id: userId!, date: localDateString(), weight_kg });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weightLogs', userId] }),
  });
}
```

**Step 3: UI en `src/app/(tabs)/profile.tsx`**

Agregar panel con:
- Último peso registrado (badge grande)
- Mini sparkline de últimas 7 entradas (usar `View` bars, no librería externa)
- Input para registrar peso de hoy con stepper (mismo patrón que quiz.tsx)

```tsx
<WeightPanel userId={userId} isDemo={isDemo} />
```

Implementación del panel:
```tsx
function WeightPanel({ userId, isDemo }: { userId: string | null; isDemo: boolean }) {
  const { data: logs = [] } = useWeightLogs(isDemo ? null : userId);
  const logWeight = useLogWeight(isDemo ? null : userId);
  const [inputKg, setInputKg] = useState('');

  const latest = logs[0]?.weight_kg;
  const last7 = [...logs].reverse().slice(-7);
  const minW = Math.min(...last7.map(l => Number(l.weight_kg)));
  const maxW = Math.max(...last7.map(l => Number(l.weight_kg)));
  const range = maxW - minW || 1;

  return (
    <SystemPanel>
      <SystemText style={sectionLabel}>Peso corporal</SystemText>
      {latest && (
        <GradientText style={{ fontSize: 36, fontWeight: '900' }}>
          {latest} kg
        </GradientText>
      )}
      {/* Mini sparkline */}
      {last7.length > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 40, gap: 4, marginVertical: 12 }}>
          {last7.map((l, i) => {
            const h = ((Number(l.weight_kg) - minW) / range) * 32 + 8;
            return <View key={i} style={{ flex: 1, height: h, backgroundColor: colors.glow + '80', borderRadius: 2 }} />;
          })}
        </View>
      )}
      {!isDemo && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <SystemInput
            placeholder={`${latest ?? 70} kg`}
            value={inputKg}
            onChangeText={setInputKg}
            keyboardType="decimal-pad"
            style={{ flex: 1 }}
          />
          <SystemButton
            title="Guardar"
            variant="gradient"
            onPress={() => {
              if (inputKg) { logWeight.mutate(parseFloat(inputKg)); setInputKg(''); }
            }}
          />
        </View>
      )}
    </SystemPanel>
  );
}
```

**Verification:** Registrar peso → aparece en el panel → sparkline se actualiza.

---

### Task 3: Comidas Favoritas ⭐

**Files:**
- Create DB: tabla `meal_favorites`
- Modify: `src/hooks/useData.ts` — `useMealFavorites`, `useSaveFavorite`, `useDeleteFavorite`
- Modify: `src/app/nutrition/search.tsx` — botón ⭐ en detalle de alimento + tab "Favoritos"

**Step 1: Tabla en Supabase**

```sql
CREATE TABLE IF NOT EXISTS hunterfit.meal_favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  kcal integer NOT NULL,
  protein_g numeric(5,1) DEFAULT 0,
  carbs_g numeric(5,1) DEFAULT 0,
  fat_g numeric(5,1) DEFAULT 0,
  serving_g integer DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hunterfit.meal_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON hunterfit.meal_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**Step 2: Hooks en `src/hooks/useData.ts`**

```ts
export function useMealFavorites(userId: string | null) {
  return useQuery({
    queryKey: ['favorites', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_favorites')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveFavorite(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (meal: { name: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number }) => {
      const { error } = await supabase.from('meal_favorites').insert({ user_id: userId!, ...meal });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites', userId] }),
  });
}

export function useDeleteFavorite(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meal_favorites').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites', userId] }),
  });
}
```

**Step 3: UI en `src/app/nutrition/search.tsx`**

1. Agregar tab "Favoritos" junto a los meal type pills (o como sección separada arriba del buscador)
2. En el detalle de alimento seleccionado, agregar botón "⭐ Guardar como favorito"
3. Lista de favoritos: tap para seleccionar → misma UI de detalle

---

### Task 4: Copiar Comidas del Día Anterior 🔁

**Files:**
- Modify: `src/app/(tabs)/nutrition.tsx` — botón "Copiar ayer" en header

**Step 1: Función helper en nutrition.tsx**

```tsx
async function handleCopyYesterday() {
  if (!userId) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toISOString().split('T')[0];
  const today = localDateString();

  const { data: yMeals, error } = await supabase
    .from('meal_logs')
    .select('meal_type, custom_name, quantity_g, kcal, protein_g, carbs_g, fat_g')
    .eq('user_id', userId)
    .eq('date', yDate);

  if (error || !yMeals?.length) {
    Alert.alert('Sin comidas', 'No hay comidas registradas ayer.');
    return;
  }

  const rows = yMeals.map(m => ({ ...m, user_id: userId, date: today, source: 'manual' }));
  const { error: insErr } = await supabase.from('meal_logs').insert(rows);
  if (insErr) throw insErr;
  queryClient.invalidateQueries({ queryKey: ['meals', userId, today] });
  Alert.alert('✓ Listo', `${yMeals.length} comidas copiadas de ayer`);
}
```

**Step 2: Botón en el header de nutrition.tsx**

```tsx
<Pressable onPress={handleCopyYesterday} style={{ paddingVertical: 6 }}>
  <SystemText style={{ color: colors.glow, fontSize: 12 }}>🔁 Copiar ayer</SystemText>
</Pressable>
```

---

## FASE 2 — Features de Impacto Medio (3–5h cada uno)

---

### Task 5: Navegación de Fechas en Nutrición 📅

**Files:**
- Modify: `src/app/(tabs)/nutrition.tsx` — date navigator (← fecha →)
- Modify: `src/hooks/useHunterData.ts` — pasar fecha seleccionada a `useMealLogs`

**Step 1: Estado de fecha en nutrition.tsx**

```tsx
const [selectedDate, setSelectedDate] = useState(localDateString());

function goDay(delta: number) {
  const d = new Date(selectedDate);
  d.setDate(d.getDate() + delta);
  // No ir al futuro
  if (d > new Date()) return;
  setSelectedDate(d.toISOString().split('T')[0]);
}
```

**Step 2: Navigator UI**

```tsx
<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
  <Pressable onPress={() => goDay(-1)}>
    <SystemText style={{ color: colors.glow, fontSize: 20 }}>‹</SystemText>
  </Pressable>
  <SystemText style={{ fontWeight: '700', fontSize: 14 }}>
    {selectedDate === localDateString()
      ? 'Hoy'
      : new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
    }
  </SystemText>
  <Pressable onPress={() => goDay(1)} style={{ opacity: selectedDate === localDateString() ? 0.3 : 1 }}>
    <SystemText style={{ color: colors.glow, fontSize: 20 }}>›</SystemText>
  </Pressable>
</View>
```

**Step 3: Pasar `selectedDate` a `useMealLogs`**

En nutrition.tsx, llamar `useMealLogs(userId, selectedDate)` en vez de `useHunterData()` para meals (o extender `useHunterData` para aceptar fecha).

---

### Task 6: Gráficas de Progreso 📊

**Files:**
- Install: No instalar librerías externas — usar `View` bars SVG-style (como se hace en el CalorieRing)
- Create: `src/components/WeeklyChart.tsx`
- Modify: `src/app/(tabs)/profile.tsx` — sección "Progreso semanal"

**Step 1: Datos de la última semana**

Hook `useWeeklyNutrition(userId)`:
```ts
queryFn: async () => {
  const dates = Array.from({length: 7}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    return d.toISOString().split('T')[0];
  });
  const { data } = await supabase
    .from('meal_logs')
    .select('date, kcal')
    .eq('user_id', userId!)
    .in('date', dates);
  // Agrupa por fecha
  return dates.map(date => ({
    date,
    kcal: (data ?? []).filter(m => m.date === date).reduce((s, m) => s + m.kcal, 0),
  }));
}
```

**Step 2: Componente `WeeklyChart.tsx`**

Barra chart con `View` por día, height proporcional al máximo, labels de día (L/M/X/J/V/S/D), línea de meta calórica.

```tsx
export function WeeklyChart({ data, target }: { data: {date: string; kcal: number}[]; target: number }) {
  const max = Math.max(target * 1.3, ...data.map(d => d.kcal), 1);
  const days = ['D','L','M','X','J','V','S'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 4 }}>
      {data.map((d, i) => {
        const h = (d.kcal / max) * 70;
        const isToday = d.date === localDateString();
        const overTarget = d.kcal > target;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View style={{
              width: '100%', height: Math.max(h, 2), borderRadius: 3,
              backgroundColor: overTarget ? colors.danger : isToday ? colors.glow : colors.glow + '50',
            }} />
            <SystemText dim style={{ fontSize: 9 }}>
              {days[new Date(d.date + 'T12:00').getDay()]}
            </SystemText>
          </View>
        );
      })}
    </View>
  );
}
```

---

### Task 7: Escáner de Código de Barras 📱

**Files:**
- Install: `expo install expo-barcode-scanner` (o usar `expo-camera` que ya puede escanear)
- Create: `src/app/nutrition/barcode.tsx`
- Modify: `src/app/nutrition/search.tsx` — botón 📷 al lado del buscador

**Step 1: Pantalla `src/app/nutrition/barcode.tsx`**

Usa `expo-camera` con `barCodeScannerSettings`. Al escanear:
1. Llama Open Food Facts API (gratis, no requiere API key):
   `https://world.openfoodfacts.org/api/v3/product/{barcode}.json`
2. Extrae `product.nutriments`: `energy-kcal_100g`, `proteins_100g`, `carbohydrates_100g`, `fat_100g`
3. Pre-llena el formulario de búsqueda con los datos encontrados
4. Si no encuentra → muestra form manual pre-llenado con el barcode como nombre

```tsx
const API = 'https://world.openfoodfacts.org/api/v3/product';

async function lookupBarcode(barcode: string) {
  const res = await fetch(`${API}/${barcode}.json`);
  const json = await res.json();
  if (json.status !== 'success') return null;
  const p = json.product;
  const n = p.nutriments ?? {};
  return {
    name: p.product_name_es ?? p.product_name ?? barcode,
    kcal: Math.round(n['energy-kcal_100g'] ?? 0),
    protein_g: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
    carbs_g: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
    fat_g: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
  };
}
```

**Step 2: Agregar ruta en `_layout.tsx`**

```tsx
<Stack.Screen name="nutrition/barcode" />
```

**Step 3: Botón en search.tsx header**

```tsx
<Pressable onPress={() => router.push('/nutrition/barcode')}>
  <SystemText style={{ color: colors.glow }}>📷</SystemText>
</Pressable>
```

**Nota importante:** Open Food Facts tiene mejor cobertura de productos mexicanos/latinos que alternativas de pago.

---

### Task 8: Notificaciones de Recordatorio 🔔

**Files:**
- Install: `expo install expo-notifications`
- Create: `src/lib/notifications.ts`
- Modify: `src/app/(tabs)/profile.tsx` — toggle "Recordatorios de comidas"
- Modify: `src/app/_layout.tsx` — solicitar permisos al iniciar

**Step 1: `src/lib/notifications.ts`**

```ts
import * as Notifications from 'expo-notifications';

export const REMINDER_TIMES = [
  { hour: 8, minute: 0, id: 'breakfast', title: '🍳 Desayuno', body: '¿Ya registraste tu desayuno?' },
  { hour: 13, minute: 0, id: 'lunch', title: '🍽️ Comida', body: 'No olvides registrar tu comida del día.' },
  { hour: 20, minute: 0, id: 'dinner', title: '🌙 Cena', body: '¿Ya cerraste tu día de nutrición?' },
];

export async function scheduleReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of REMINDER_TIMES) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body, sound: true },
      trigger: { hour: r.hour, minute: r.minute, repeats: true, type: 'daily' } as any,
    });
  }
}

export async function cancelReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
```

**Step 2: Toggle en profile.tsx**

```tsx
const [remindersEnabled, setRemindersEnabled] = useState(false);

async function toggleReminders() {
  if (!remindersEnabled) {
    const granted = await requestPermissions();
    if (!granted) { Alert.alert('Permisos', 'Activa las notificaciones en Configuración.'); return; }
    await scheduleReminders();
    setRemindersEnabled(true);
  } else {
    await cancelReminders();
    setRemindersEnabled(false);
  }
}
```

UI: Switch + label "Recordatorios de comidas" en la sección de acciones del perfil.

**Step 3: Request permisos en `_layout.tsx`**

```tsx
useEffect(() => {
  Notifications.requestPermissionsAsync();
}, []);
```

---

## FASE 3 — Polish RPG (diferenciadores únicos)

---

### Task 9: Pantalla de Nivel / Rank-Up Animation

**Files:**
- Create: `src/components/LevelUpModal.tsx`
- Modify: `src/hooks/useData.ts` — detectar cambio de level en `useGrantXp` onSuccess
- Modify: `src/app/(tabs)/home.tsx` — mostrar modal al subir de nivel

**Step 1: `src/components/LevelUpModal.tsx`**

Modal con animación de entrada (FadeIn + scale spring), fondo semitransparente, texto "¡SUBISTE DE NIVEL!" con GradientText, número de nivel grande, cierra con tap.

**Step 2: Detectar level-up**

En `useGrantXp` onSuccess, comparar nivel anterior vs nuevo:
```ts
onSuccess: (newProfile) => {
  if (newProfile.level > previousLevel) {
    setLevelUpTo(newProfile.level); // estado global o callback
  }
}
```

---

### Task 10: Streak de Hidratación y Nutrición 🔥

**Files:**
- Modify: `src/app/(tabs)/home.tsx` — mostrar streak de agua (días consecutivos bebiendo >80% de meta)
- Modify: DB: función `check_streaks` o calcular en cliente

Lógica simple en cliente: si `totalMl >= 2000` hoy, incrementar streak de agua en el perfil.

---

## Orden de Implementación Recomendado

```
Semana 1 (Quick wins):
  Task 1 → Agua 💧
  Task 2 → Peso ⚖️
  Task 3 → Favoritos ⭐
  Task 4 → Copiar ayer 🔁

Semana 2 (Features de impacto):
  Task 5 → Navegación de fechas 📅
  Task 6 → Gráficas 📊

Semana 3 (Features técnicas):
  Task 7 → Escáner de barras 📱
  Task 8 → Notificaciones 🔔

Semana 4 (Polish RPG):
  Task 9 → LevelUp animation
  Task 10 → Streaks de hábitos
```

---

## Consideraciones Técnicas Globales

### Supabase RLS
Cada tabla nueva necesita:
```sql
ALTER TABLE hunterfit.nueva_tabla ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own data" ON hunterfit.nueva_tabla FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### React Query cache keys
Convención: `[entidad, userId, fecha?]`. Ejemplo: `['water', userId, today]`.

### Design system — No inventar estilos nuevos
- Usar siempre `SystemPanel` o `SystemWindowPanel` para contenedores
- Gradientes: `gradients.brand`, `gradients.mana`
- Espaciado: `spacing.sm/md/lg/xl`
- Bordes: `radius.sm/md/lg/pill`

### Demo mode
Antes de cualquier mutación a Supabase, verificar:
```ts
if (isDemo) { Alert.alert('Modo exploración', 'Los cambios no se guardan en modo demo.'); return; }
```

### Modo offline / error handling
Todas las mutaciones deben tener `try/catch` con `Alert.alert('Error', mensaje)`.

---

## Estado Actual del Proyecto (referencia)

| Pantalla | Ruta | Estado |
|---|---|---|
| Home (calorías + misiones) | `/(tabs)/home` | ✅ Completo |
| Nutrición diaria | `/(tabs)/nutrition` | ✅ Completo |
| Entrenamiento | `/(tabs)/workouts` | ✅ Completo |
| Perfil / Stats RPG | `/(tabs)/profile` | ✅ Completo |
| Buscar alimento | `/nutrition/search` | ✅ Completo (con IA + manual) |
| Quiz onboarding | `/onboarding/quiz` | ✅ Completo |
| Selección personaje | `/onboarding/character-select` | ✅ Completo |
| Foto corporal | `/onboarding/body-photo` | ✅ Completo |
| Callback OAuth | `/auth/callback` | ✅ Completo |
| Escáner código barras | `/nutrition/barcode` | ❌ Pendiente (Task 7) |
