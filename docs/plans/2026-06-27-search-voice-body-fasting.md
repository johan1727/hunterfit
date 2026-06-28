# Search Fix + Voice Food + Body Tracking + Fasting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the food search category filter bug, add voice food logging, build a body tracking screen, and add an optional intermittent fasting timer.

**Architecture:** Four independent features — the search fix is a 2-line change; voice food logging adds an expo-av recording flow + new Edge Function; body tracking reuses existing `weight_logs` and `progress_photos` tables in a new screen with an SVG weight chart; fasting is a new screen + DB table with a countdown timer and push notifications.

**Tech Stack:** React Native (Expo SDK 56), expo-av (audio recording), react-native-svg (already installed, for weight chart), expo-notifications (already installed, for fasting alerts), Supabase Edge Functions (Deno), Gemini 2.5 Flash API, Zustand (demoStore), React Query.

---

## Global Constraints

- Schema: `hunterfit` only. Never touch `public`.
- All new Supabase tables go in `hunterfit` schema with `user_id uuid references auth.users`.
- All new screens follow Aurora Maximalism: bg `#07080B`, brand gradient azul→violeta→rosa.
- Use `SystemPanel`, `SystemText`, `GradientText`, `AuroraBackground`, `SystemButton` from `src/components/system.tsx`.
- `GradientText` uses prop `colors` (not `stops`).
- `Pill.style` applies to internal Text, not to View — never pass `borderColor`/`backgroundColor` to it.
- Always check `isDemo` before Supabase calls; return mock data in demo mode.
- New Edge Functions must match the structure of `supabase/functions/analyze-food/index.ts`: CORS headers, JSON response, GEMINI_API_KEY env var, `gemini-2.5-flash` model.
- No new third-party npm packages for charts — use `react-native-svg` (already installed at 15.15.4) directly.
- `expo-av` must be installed for audio recording (see Task 3).
- File imports: use relative paths from the file's location.
- Commits: one logical commit per task with descriptive message.

---

### Task 1: Fix food search — text search bypasses category filter

**Context:** When a user has a category pill active (e.g. "Cereales") and types "tacos" in the search bar, no results appear because `useFoodSearch` adds `.eq('category', 'Cereales')` to the Supabase query. The fix: when `searchTerm.length >= 2`, ignore both the category pill and the subcategory filter — text search takes full precedence.

**Files:**
- Modify: `src/app/nutrition/search.tsx` (lines ~174 and ~187-189)

**Step 1: Understand current state**

Read `src/app/nutrition/search.tsx` lines 171–195. You'll see:
```tsx
const { data: searchResults = [], isLoading: searching } = useFoodSearch(searchTerm, selectedCategory);
// ...
const baseFoods = searchTerm.length >= 2 ? searchResults : defaultFoods;
const foods = selectedSubcat
  ? baseFoods.filter(f => classifySubcat(f.name_es, selectedCategory) === selectedSubcat)
  : baseFoods;
```

**Step 2: Apply the fix**

Change line 174 from:
```tsx
const { data: searchResults = [], isLoading: searching } = useFoodSearch(searchTerm, selectedCategory);
```
To:
```tsx
// When user types, search all categories — text query takes precedence over category filter
const { data: searchResults = [], isLoading: searching } = useFoodSearch(searchTerm);
```

Change lines 187–189 from:
```tsx
const foods = selectedSubcat
  ? baseFoods.filter(f => classifySubcat(f.name_es, selectedCategory) === selectedSubcat)
  : baseFoods;
```
To:
```tsx
// Subcat filter also bypassed during text search
const foods = (selectedSubcat && searchTerm.length < 2)
  ? baseFoods.filter(f => classifySubcat(f.name_es, selectedCategory) === selectedSubcat)
  : baseFoods;
```

**Step 3: Verify manually**

Run the app and:
1. Go to Nutrición → buscar alimento
2. Select "Cereales" category pill
3. Type "tacos" — should now show results from Platillos category
4. Clear search — should return to Cereales-filtered default foods
5. Select "Cereales > Arroz" subcat, type "pollo" — should show chicken results ignoring subcat

**Step 4: Commit**
```bash
git add src/app/nutrition/search.tsx
git commit -m "fix: text search in food screen bypasses active category/subcat filter"
```

---

### Task 2: DB migration — body_measurements + fasting_logs tables

**Context:** Body tracking needs measurements (waist, hips, etc.) — weight is already in `weight_logs`, photos in `progress_photos`. Fasting needs a log of fast start/end times. Create `0009_body_fasting.sql`. Run it manually in Supabase Dashboard SQL Editor.

**Files:**
- Create: `supabase/migrations/0009_body_fasting.sql`

**Step 1: Create migration file**

```sql
-- HunterFit — Migration 0009: body_measurements + fasting_logs

-- Body measurements (waist, hips, chest, arm, body fat %)
create table if not exists hunterfit.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  taken_at date not null default current_date,
  weight_kg numeric(5,2),
  waist_cm numeric(5,1),
  hips_cm numeric(5,1),
  chest_cm numeric(5,1),
  arm_cm numeric(5,1),
  body_fat_pct numeric(4,1),
  notes text,
  created_at timestamptz default now()
);

alter table hunterfit.body_measurements enable row level security;

do $$ begin
  create policy "body_measurements_own" on hunterfit.body_measurements
    for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists body_measurements_user_date
  on hunterfit.body_measurements(user_id, taken_at desc);

-- Fasting logs
create table if not exists hunterfit.fasting_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  target_hours integer not null default 16,
  completed boolean default false,
  created_at timestamptz default now()
);

alter table hunterfit.fasting_logs enable row level security;

do $$ begin
  create policy "fasting_logs_own" on hunterfit.fasting_logs
    for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists fasting_logs_user_started
  on hunterfit.fasting_logs(user_id, started_at desc);
```

**Step 2: Run in Supabase Dashboard**

Go to: Supabase Dashboard → SQL Editor → paste the file contents → Run.

Verify both tables appear in Table Editor under `hunterfit` schema.

**Step 3: Commit**
```bash
git add supabase/migrations/0009_body_fasting.sql
git commit -m "feat: add body_measurements and fasting_logs tables (migration 0009)"
```

---

### Task 3: Voice food logging — install expo-av + Edge Function

**Context:** User speaks food name → audio recorded with expo-av → sent as base64 to a new Supabase Edge Function → Gemini transcribes + extracts food name → returned to app to auto-search.

**Files:**
- Create: `supabase/functions/voice-food/index.ts`

**Step 1: Install expo-av**

```bash
cd hunterfit
npx expo install expo-av
```

expo-av version for SDK 56 is `~15.0.0`. After install, verify `package.json` has `"expo-av": "~15.0.0"` (or similar).

**Step 2: Create Edge Function**

Create `supabase/functions/voice-food/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { audio_base64, mime_type = 'audio/m4a' } = await req.json();
    if (!audio_base64) {
      return new Response(JSON.stringify({ error: 'audio_base64 requerido' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY no configurado');

    const prompt = `El usuario ha grabado un audio diciendo el nombre de un alimento que quiere registrar en su dieta.
Transcribe lo que dice y extrae el alimento y la cantidad si se menciona.
Devuelve ÚNICAMENTE un JSON válido (sin markdown, sin texto extra) con este formato:
{
  "alimento": "nombre del alimento en español, singular y limpio",
  "cantidad_g": 100,
  "confianza": "alta"
}

Reglas:
- "alimento" debe ser el nombre limpio del alimento (ej: "pollo a la plancha", "arroz blanco", "manzana")
- "cantidad_g" es la cantidad en gramos si se menciona, sino usa 100 como valor por defecto
- "confianza": "alta" si el audio es claro, "media" si hay duda, "baja" si no se entiende
- Si no hay alimento reconocible devuelve { "alimento": "", "cantidad_g": 100, "confianza": "baja" }`;

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type, data: audio_base64 } },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini error ${geminiRes.status}: ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleaned);

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
```

**Step 3: Test Edge Function locally (optional)**

If Supabase CLI is available:
```bash
supabase functions serve voice-food --env-file .env.local
```

**Step 4: Commit**
```bash
git add supabase/functions/voice-food/
git commit -m "feat: add voice-food edge function (Gemini audio transcription)"
```

---

### Task 4: Voice food logging — UI mic button in search screen

**Context:** Add a mic button to `src/app/nutrition/search.tsx`. When tapped: show a bottom modal, record audio with expo-av, on stop send to `voice-food` edge function, auto-populate `searchTerm` with the recognized food name.

**Files:**
- Modify: `src/app/nutrition/search.tsx`

**Step 1: Add imports**

At the top of `src/app/nutrition/search.tsx`, add:
```tsx
import { Audio } from 'expo-av';
import { Modal } from 'react-native';
```

**Step 2: Add state and recording logic**

Inside `SearchFoodScreen()`, after existing state declarations, add:
```tsx
const [showVoice, setShowVoice] = useState(false);
const [recording, setRecording] = useState<Audio.Recording | null>(null);
const [voiceLoading, setVoiceLoading] = useState(false);

async function startRecording() {
  try {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      Alert.alert('Permisos', 'Se necesita acceso al micrófono para usar esta función');
      return;
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    setRecording(rec);
  } catch (err) {
    Alert.alert('Error', 'No se pudo iniciar la grabación');
  }
}

async function stopRecordingAndAnalyze() {
  if (!recording) return;
  setVoiceLoading(true);
  try {
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
    setRecording(null);
    if (!uri) throw new Error('No se obtuvo el audio');

    // Read as base64
    const { File } = await import('expo-file-system');
    const file = new File(uri);
    const base64 = await file.readAsText('base64');

    const { data, error } = await supabase.functions.invoke('voice-food', {
      body: { audio_base64: base64, mime_type: 'audio/m4a' },
    });
    if (error) throw error;
    const result = data as { alimento: string; cantidad_g: number; confianza: string };
    if (!result.alimento) {
      Alert.alert('No entendí', 'No reconocí un alimento. Intenta de nuevo o escribe el nombre.');
      return;
    }
    setShowVoice(false);
    setSearchTerm(result.alimento);
  } catch (err: any) {
    Alert.alert('Error', err?.message ?? 'No se pudo procesar el audio');
  } finally {
    setVoiceLoading(false);
  }
}
```

**Step 3: Add mic button to the search bar area**

Find the TextInput for search (it has `value={searchTerm}` and `onChangeText={setSearchTerm}`). Wrap it in a row View with the mic button on the right:

```tsx
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <TextInput
    style={[styles.searchInput, { flex: 1 }]}
    placeholder="Buscar alimento…"
    placeholderTextColor={colors.textDim}
    value={searchTerm}
    onChangeText={setSearchTerm}
  />
  <Pressable
    onPress={() => setShowVoice(true)}
    style={styles.micBtn}
  >
    <Ionicons name="mic" size={20} color={colors.primary} />
  </Pressable>
</View>
```

Add to StyleSheet:
```tsx
micBtn: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: colors.surface,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: colors.border,
},
```

**Step 4: Add the voice modal**

Before the closing `</SafeAreaView>`, add:
```tsx
<Modal visible={showVoice} transparent animationType="slide">
  <View style={styles.voiceOverlay}>
    <SystemPanel style={styles.voicePanel}>
      <GradientText style={{ fontSize: 20, marginBottom: 8 }}>Registro por Voz</GradientText>
      <SystemText dim style={{ textAlign: 'center', marginBottom: 24 }}>
        {recording ? 'Grabando… toca para terminar' : voiceLoading ? 'Analizando…' : 'Toca el micrófono y di el alimento'}
      </SystemText>
      <Pressable
        onPress={recording ? stopRecordingAndAnalyze : startRecording}
        disabled={voiceLoading}
        style={[styles.micBig, recording && styles.micBigActive]}
      >
        <Ionicons
          name={voiceLoading ? 'hourglass' : recording ? 'stop' : 'mic'}
          size={36}
          color="#fff"
        />
      </Pressable>
      <SystemButton
        label="Cancelar"
        variant="ghost"
        style={{ marginTop: 16 }}
        onPress={async () => {
          if (recording) {
            await recording.stopAndUnloadAsync().catch(() => {});
            setRecording(null);
          }
          setShowVoice(false);
        }}
      />
    </SystemPanel>
  </View>
</Modal>
```

Add to StyleSheet:
```tsx
voiceOverlay: {
  flex: 1,
  backgroundColor: '#00000080',
  justifyContent: 'flex-end',
},
voicePanel: {
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  padding: 32,
  alignItems: 'center',
},
micBig: {
  width: 80,
  height: 80,
  borderRadius: 40,
  backgroundColor: colors.primary,
  alignItems: 'center',
  justifyContent: 'center',
},
micBigActive: {
  backgroundColor: colors.danger,
},
```

**Step 5: Verify**

1. Run the app, go to Buscar Alimento
2. Tap the mic button — modal appears
3. Tap the large mic — starts recording (button turns red)
4. Say "pollo a la plancha"
5. Tap stop — shows "Analizando…"
6. Modal closes, search bar auto-populated with "pollo a la plancha"
7. Results appear

**Step 6: Commit**
```bash
git add src/app/nutrition/search.tsx
git commit -m "feat: add voice food logging with expo-av and Gemini audio transcription"
```

---

### Task 5: Body tracking screen

**Context:** Create a new screen at `src/app/profile/body-tracking.tsx` that shows:
1. A weight history SVG line chart (using `react-native-svg` + existing `weight_logs` data)
2. A form to add body measurements (waist, hips, chest, arm, body fat %)
3. A history list of recent measurements
Add navigation from the profile tab.

**Files:**
- Create: `src/app/profile/body-tracking.tsx`
- Modify: `src/app/(tabs)/profile.tsx` (add menu entry)
- Modify: `src/hooks/useData.ts` (add `useBodyMeasurements`, `useAddBodyMeasurement` hooks)

**Step 1: Add hooks to useData.ts**

At the bottom of `src/hooks/useData.ts`, add:

```typescript
export interface BodyMeasurement {
  id: string;
  taken_at: string;
  weight_kg: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  body_fat_pct: number | null;
  notes: string | null;
}

export function useBodyMeasurements(userId: string | null) {
  return useQuery({
    queryKey: ['body-measurements', userId],
    enabled: !!userId,
    queryFn: async (): Promise<BodyMeasurement[]> => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', userId!)
        .order('taken_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as BodyMeasurement[];
    },
  });
}

export function useAddBodyMeasurement(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (m: Omit<BodyMeasurement, 'id'>) => {
      const { error } = await supabase
        .from('body_measurements')
        .insert({ ...m, user_id: userId! });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['body-measurements', userId] }),
  });
}
```

**Step 2: Create the body tracking screen**

Create `src/app/profile/body-tracking.tsx`:

```tsx
import { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, TextInput, Alert, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useHunterData } from '../../hooks/useHunterData';
import { useWeightHistory, useBodyMeasurements, useAddBodyMeasurement } from '../../hooks/useData';
import { colors, radius, spacing } from '../../theme/system';
import {
  AuroraBackground, GradientText, SystemPanel, SystemText, SystemButton, Pill,
} from '../../components/system';

// Simple SVG polyline weight chart
function WeightChart({ data }: { data: { date: string; weight_kg: number }[] }) {
  if (data.length < 2) return (
    <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
      <SystemText dim>Agrega al menos 2 registros para ver la gráfica</SystemText>
    </View>
  );
  const W = 300, H = 100, PAD = 10;
  const weights = data.map(d => d.weight_kg);
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const range = max - min || 1;
  const points = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: PAD + ((max - d.weight_kg) / range) * (H - PAD * 2),
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <Svg width={W} height={H}>
      <Path d={pathD} stroke={colors.primary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={colors.primary} />
      ))}
      <SvgText x={PAD} y={H - 2} fontSize={9} fill={colors.textDim}>{data[0].date.slice(5)}</SvgText>
      <SvgText x={W - PAD - 20} y={H - 2} fontSize={9} fill={colors.textDim}>{data[data.length-1].date.slice(5)}</SvgText>
    </Svg>
  );
}

const FIELDS: { key: keyof ReturnType<typeof emptyForm>; label: string; unit: string }[] = [
  { key: 'weight_kg', label: 'Peso', unit: 'kg' },
  { key: 'waist_cm', label: 'Cintura', unit: 'cm' },
  { key: 'hips_cm', label: 'Cadera', unit: 'cm' },
  { key: 'chest_cm', label: 'Pecho', unit: 'cm' },
  { key: 'arm_cm', label: 'Brazo', unit: 'cm' },
  { key: 'body_fat_pct', label: 'Grasa corporal', unit: '%' },
];

function emptyForm() {
  return { weight_kg: '', waist_cm: '', hips_cm: '', chest_cm: '', arm_cm: '', body_fat_pct: '' };
}

export default function BodyTrackingScreen() {
  const router = useRouter();
  const { userId, isDemo } = useHunterData();
  const weightHistory = useWeightHistory(isDemo ? null : userId);
  const measurements = useBodyMeasurements(isDemo ? null : userId);
  const addMeasurement = useAddBodyMeasurement(isDemo ? null : userId);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const weightData = (weightHistory.data ?? []).slice().reverse();

  async function handleSave() {
    if (isDemo) { Alert.alert('Modo demo', 'Los cambios no se guardan en modo exploración'); return; }
    const parsed: Record<string, number | null> = {};
    for (const f of FIELDS) {
      const v = parseFloat(form[f.key].replace(',', '.'));
      parsed[f.key] = isNaN(v) ? null : v;
    }
    if (Object.values(parsed).every(v => v === null)) {
      Alert.alert('Sin datos', 'Ingresa al menos una medida');
      return;
    }
    setSaving(true);
    try {
      await addMeasurement.mutateAsync({
        taken_at: new Date().toISOString().split('T')[0],
        notes: null,
        ...parsed,
      } as any);
      setForm(emptyForm());
      Alert.alert('¡Guardado!', 'Medidas registradas');
    } catch {
      Alert.alert('Error', 'No se pudieron guardar las medidas');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Pill dotColor={colors.accent}>Seguimiento Corporal</Pill>
          <GradientText style={styles.title}>Mis Medidas</GradientText>
        </Animated.View>

        {/* Weight chart */}
        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <SystemPanel style={styles.chartPanel}>
            <SystemText style={{ fontWeight: '700', marginBottom: 12 }}>Peso (kg)</SystemText>
            <WeightChart data={weightData} />
            {weightData.length > 0 && (
              <SystemText dim style={{ textAlign: 'center', marginTop: 8, fontSize: 13 }}>
                Actual: {weightData[weightData.length - 1]?.weight_kg} kg
              </SystemText>
            )}
          </SystemPanel>
        </Animated.View>

        {/* Add measurements form */}
        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <SystemPanel style={styles.formPanel}>
            <SystemText style={{ fontWeight: '700', marginBottom: 16 }}>Registrar Medidas de Hoy</SystemText>
            <View style={styles.fieldGrid}>
              {FIELDS.map(f => (
                <View key={f.key} style={styles.field}>
                  <SystemText dim style={styles.fieldLabel}>{f.label} ({f.unit})</SystemText>
                  <TextInput
                    style={styles.fieldInput}
                    value={form[f.key]}
                    onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={colors.textDim}
                  />
                </View>
              ))}
            </View>
            <SystemButton
              label={saving ? 'Guardando…' : 'Guardar Medidas'}
              onPress={handleSave}
              disabled={saving}
              style={{ marginTop: 16 }}
            />
          </SystemPanel>
        </Animated.View>

        {/* Measurement history */}
        {(measurements.data ?? []).length > 0 && (
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            <SystemPanel style={styles.historyPanel}>
              <SystemText style={{ fontWeight: '700', marginBottom: 12 }}>Historial</SystemText>
              {(measurements.data ?? []).slice(0, 10).map(m => (
                <View key={m.id} style={styles.historyRow}>
                  <SystemText dim style={styles.historyDate}>{m.taken_at}</SystemText>
                  <View style={styles.historyValues}>
                    {m.weight_kg != null && <SystemText style={styles.historyVal}>{m.weight_kg}kg</SystemText>}
                    {m.waist_cm != null && <SystemText style={styles.historyVal}>Cin:{m.waist_cm}</SystemText>}
                    {m.hips_cm != null && <SystemText style={styles.historyVal}>Cad:{m.hips_cm}</SystemText>}
                    {m.body_fat_pct != null && <SystemText style={styles.historyVal}>{m.body_fat_pct}%</SystemText>}
                  </View>
                </View>
              ))}
            </SystemPanel>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.screen, paddingBottom: 40, gap: 12 },
  header: { paddingTop: 16, gap: 8 },
  backBtn: { marginBottom: 4 },
  title: { fontSize: 32 },
  chartPanel: { padding: 16, alignItems: 'center' },
  formPanel: { padding: 16 },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { width: '47%' },
  fieldLabel: { fontSize: 12, marginBottom: 4 },
  fieldInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    fontSize: 15,
  },
  historyPanel: { padding: 16 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  historyDate: { width: 90, fontSize: 12 },
  historyValues: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyVal: { fontSize: 13 },
});
```

**Step 3: Add navigation entry in profile.tsx**

In `src/app/(tabs)/profile.tsx`, find the `MenuList` component (or wherever navigation rows are defined). Add a new item that navigates to `/(tabs)/profile/body-tracking` — use `router.push('/profile/body-tracking')`.

Look for other profile navigation items like `router.push('/profile/badges')` and add nearby:
```tsx
{ label: 'Seguimiento Corporal', icon: 'body', onPress: () => router.push('/profile/body-tracking') },
```

**Step 4: Verify**

1. Run the app → Profile tab → tap "Seguimiento Corporal"
2. Weight chart shows if weight_logs has ≥2 entries
3. Fill in some measurements → tap Guardar → history list updates
4. Back button works

**Step 5: Commit**
```bash
git add src/app/profile/body-tracking.tsx src/app/(tabs)/profile.tsx src/hooks/useData.ts
git commit -m "feat: add body tracking screen with weight chart and measurements log"
```

---

### Task 6: Intermittent fasting screen

**Context:** Optional feature. New screen `src/app/nutrition/fasting.tsx` with:
- Schedule selector (16:8, 18:6, 20:4)
- Start/stop fasting button
- Circular progress arc (SVG) showing % of fast completed
- Countdown: time remaining to break fast
- Push notification when eating window opens (uses expo-notifications already installed)
- Current streak counter from fasting_logs
- Add navigation from nutrition tab

**Files:**
- Create: `src/app/nutrition/fasting.tsx`
- Modify: `src/app/(tabs)/nutrition.tsx` (add fasting entry button)
- Modify: `src/hooks/useData.ts` (add `useActiveFasting`, `useStartFasting`, `useStopFasting`, `useFastingStreak` hooks)

**Step 1: Add fasting hooks to useData.ts**

```typescript
export interface FastingLog {
  id: string;
  started_at: string;
  ended_at: string | null;
  target_hours: number;
  completed: boolean;
}

export function useActiveFasting(userId: string | null) {
  return useQuery({
    queryKey: ['active-fasting', userId],
    enabled: !!userId,
    refetchInterval: 30_000, // refresh every 30s to keep timer in sync
    queryFn: async (): Promise<FastingLog | null> => {
      const { data, error } = await supabase
        .from('fasting_logs')
        .select('*')
        .eq('user_id', userId!)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as FastingLog | null;
    },
  });
}

export function useStartFasting(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetHours: number) => {
      const { error } = await supabase.from('fasting_logs').insert({
        user_id: userId!,
        target_hours: targetHours,
        started_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-fasting', userId] });
      queryClient.invalidateQueries({ queryKey: ['fasting-streak', userId] });
    },
  });
}

export function useStopFasting(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('fasting_logs')
        .update({ ended_at: new Date().toISOString(), completed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-fasting', userId] });
      queryClient.invalidateQueries({ queryKey: ['fasting-streak', userId] });
    },
  });
}

export function useFastingStreak(userId: string | null) {
  return useQuery({
    queryKey: ['fasting-streak', userId],
    enabled: !!userId,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('fasting_logs')
        .select('completed, ended_at')
        .eq('user_id', userId!)
        .eq('completed', true)
        .not('ended_at', 'is', null)
        .order('ended_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      // Count consecutive days with a completed fast
      const days = new Set(
        (data ?? []).map((r: any) => (r.ended_at as string).split('T')[0])
      );
      const arr = [...days].sort().reverse();
      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      for (let i = 0; i < arr.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);
        if (arr[i] === expected.toISOString().split('T')[0]) streak++;
        else break;
      }
      return streak;
    },
  });
}
```

**Step 2: Create fasting screen**

Create `src/app/nutrition/fasting.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Alert, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import * as Notifications from 'expo-notifications';
import { useHunterData } from '../../hooks/useHunterData';
import { useActiveFasting, useStartFasting, useStopFasting, useFastingStreak } from '../../hooks/useData';
import { colors, radius, spacing } from '../../theme/system';
import {
  AuroraBackground, GradientText, SystemPanel, SystemText, SystemButton, Pill,
} from '../../components/system';

const SCHEDULES = [
  { label: '16:8', fasting: 16, eating: 8, desc: 'Popular · Ayuno 16h, comer en 8h' },
  { label: '18:6', fasting: 18, eating: 6, desc: 'Intenso · Ayuno 18h, comer en 6h' },
  { label: '20:4', fasting: 20, eating: 4, desc: 'Avanzado · Ayuno 20h, comer en 4h' },
];

function CircleTimer({ pct, hoursLeft, minsLeft, isFasting }: {
  pct: number; hoursLeft: number; minsLeft: number; isFasting: boolean;
}) {
  const R = 80, CX = 100, CY = 100;
  const circumference = 2 * Math.PI * R;
  const dashoffset = circumference * (1 - Math.min(1, pct));
  return (
    <Svg width={200} height={200}>
      <Circle cx={CX} cy={CY} r={R} stroke={colors.surface} strokeWidth={12} fill="none" />
      <Circle
        cx={CX} cy={CY} r={R}
        stroke={isFasting ? colors.primary : colors.success}
        strokeWidth={12} fill="none"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={dashoffset}
        strokeLinecap="round"
        rotation="-90" origin={`${CX},${CY}`}
      />
      <SvgText x={CX} y={CY - 10} textAnchor="middle" fontSize={28} fontWeight="bold" fill={colors.text}>
        {String(hoursLeft).padStart(2, '0')}:{String(minsLeft).padStart(2, '0')}
      </SvgText>
      <SvgText x={CX} y={CY + 18} textAnchor="middle" fontSize={13} fill={colors.textDim}>
        {isFasting ? 'horas restantes' : '¡Ventana abierta!'}
      </SvgText>
    </Svg>
  );
}

async function scheduleFastingNotification(endAt: Date) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🍽️ ¡Tu ventana de comida está abierta!',
      body: 'Has completado tu ayuno. Puedes comer ahora.',
    },
    trigger: { date: endAt },
  });
}

export default function FastingScreen() {
  const router = useRouter();
  const { userId, isDemo } = useHunterData();
  const activeFasting = useActiveFasting(isDemo ? null : userId);
  const startFasting = useStartFasting(isDemo ? null : userId);
  const stopFasting = useStopFasting(isDemo ? null : userId);
  const streak = useFastingStreak(isDemo ? null : userId);
  const [selectedSchedule, setSelectedSchedule] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Tick every minute for timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const active = activeFasting.data;
  const startedAt = active ? new Date(active.started_at).getTime() : null;
  const targetMs = active ? active.target_hours * 3600_000 : 0;
  const elapsed = startedAt ? now - startedAt : 0;
  const remaining = active ? Math.max(0, targetMs - elapsed) : 0;
  const pct = active ? Math.min(1, elapsed / targetMs) : 0;
  const hoursLeft = Math.floor(remaining / 3600_000);
  const minsLeft = Math.floor((remaining % 3600_000) / 60_000);
  const windowOpen = active && elapsed >= targetMs;

  async function handleStart() {
    if (isDemo) { Alert.alert('Modo demo', 'No disponible en modo exploración'); return; }
    const schedule = SCHEDULES[selectedSchedule];
    try {
      await startFasting.mutateAsync(schedule.fasting);
      const endAt = new Date(Date.now() + schedule.fasting * 3600_000);
      const { granted } = await Notifications.requestPermissionsAsync();
      if (granted) await scheduleFastingNotification(endAt);
    } catch {
      Alert.alert('Error', 'No se pudo iniciar el ayuno');
    }
  }

  async function handleStop(forceEnd = false) {
    if (!active) return;
    Alert.alert(
      forceEnd ? 'Terminar ayuno' : '¿Romper ayuno?',
      forceEnd ? '¡Felicitaciones! ¿Marcar como completado?' : 'Terminarás el ayuno antes de la meta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: forceEnd ? 'Completar ✓' : 'Terminar',
          onPress: async () => {
            try {
              await stopFasting.mutateAsync({ id: active.id, completed: windowOpen });
              await Notifications.cancelAllScheduledNotificationsAsync();
            } catch {
              Alert.alert('Error', 'No se pudo terminar el ayuno');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Pill dotColor={colors.warning}>Ayuno Intermitente</Pill>
          <GradientText style={styles.title}>Control de Ayuno</GradientText>
        </Animated.View>

        {/* Streak */}
        <Animated.View entering={FadeInDown.delay(40).springify()}>
          <SystemPanel style={styles.streakPanel}>
            <Ionicons name="flame" size={20} color={colors.warning} />
            <SystemText style={{ marginLeft: 8, fontWeight: '700', fontSize: 16 }}>
              Racha: {streak.data ?? 0} días
            </SystemText>
          </SystemPanel>
        </Animated.View>

        {/* Timer or schedule picker */}
        {active ? (
          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.timerPanel}>
            <SystemPanel>
              <SystemText dim style={{ textAlign: 'center', marginBottom: 8 }}>
                {windowOpen ? '🎉 ¡Ventana abierta! Puedes comer' : `Ayuno ${active.target_hours}:${24 - active.target_hours}`}
              </SystemText>
              <View style={{ alignItems: 'center' }}>
                <CircleTimer pct={pct} hoursLeft={hoursLeft} minsLeft={minsLeft} isFasting={!windowOpen} />
              </View>
              <View style={styles.btnRow}>
                {windowOpen ? (
                  <SystemButton label="Completar Ayuno ✓" onPress={() => handleStop(true)} />
                ) : (
                  <SystemButton label="Romper Ayuno" variant="ghost" onPress={() => handleStop(false)} />
                )}
              </View>
            </SystemPanel>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <SystemPanel style={styles.schedulePanel}>
              <SystemText style={{ fontWeight: '700', marginBottom: 16 }}>Elige tu protocolo</SystemText>
              {SCHEDULES.map((s, i) => (
                <Pressable
                  key={s.label}
                  onPress={() => setSelectedSchedule(i)}
                  style={[styles.scheduleItem, selectedSchedule === i && styles.scheduleItemActive]}
                >
                  <SystemText style={{ fontWeight: '700', fontSize: 18 }}>{s.label}</SystemText>
                  <SystemText dim style={{ fontSize: 13 }}>{s.desc}</SystemText>
                </Pressable>
              ))}
              <SystemButton
                label="Iniciar Ayuno"
                style={{ marginTop: 16 }}
                onPress={handleStart}
                disabled={startFasting.isPending}
              />
            </SystemPanel>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.screen, paddingBottom: 40, gap: 12 },
  header: { paddingTop: 16, gap: 8 },
  backBtn: { marginBottom: 4 },
  title: { fontSize: 32 },
  streakPanel: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  timerPanel: {},
  btnRow: { marginTop: 16 },
  schedulePanel: { padding: 16 },
  scheduleItem: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 4,
  },
  scheduleItemActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
});
```

**Step 3: Add fasting navigation in nutrition.tsx**

In `src/app/(tabs)/nutrition.tsx`, find where other navigation buttons are (look for `MenuList` or rows with `router.push`). Add a fasting entry, for example near the bottom of the screen options:

```tsx
{ label: 'Ayuno Intermitente', icon: 'timer-outline', onPress: () => router.push('/nutrition/fasting') },
```

**Step 4: Verify**

1. Nutrition tab → tap "Ayuno Intermitente"
2. Fasting screen shows schedule picker
3. Select 16:8 → tap Iniciar Ayuno
4. Timer starts, shows countdown arc
5. Notification should arrive after 16h (test by setting target_hours to 0.001 in dev)
6. Tap "Romper Ayuno" → prompt → confirmed → returns to schedule picker

**Step 5: Commit**
```bash
git add src/app/nutrition/fasting.tsx src/app/(tabs)/nutrition.tsx src/hooks/useData.ts
git commit -m "feat: add intermittent fasting timer with schedule picker and push notifications"
```

---

## Execution Notes

- Tasks 1 and 2 are independent — can be done in any order.
- Task 3 (Edge Function) must be completed before Task 4 (Voice UI), since Task 4 calls `supabase.functions.invoke('voice-food', ...)`.
- Task 5 and Task 6 are independent of each other and of Tasks 3-4.
- The 0009 migration (Task 2) must be run in Supabase Dashboard before Tasks 5 and 6 can save data to `body_measurements` and `fasting_logs` respectively.
- For `expo-av` to record on device, the app needs microphone permission in `app.json` (`"android": { "permissions": ["RECORD_AUDIO"] }` and iOS `NSMicrophoneUsageDescription`). Verify these are present; if not, add them before Task 4.
