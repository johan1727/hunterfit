# Premium, Schema Faltante y FileSystem Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corregir 3 bugs críticos (expo-file-system/legacy, tablas faltantes en Supabase, RevenueCat TODO) y agregar gate premium a las features de IA.

**Architecture:** 6 tareas ordenadas por impacto: primero la migration SQL (sin ella leaderboard/badges/shopping/fotos crashean), luego los fixes de FileSystem, luego el servicio de compras mock y finalmente el gate premium en UI.

**Tech Stack:** Expo SDK 56, React Native, Supabase (migrations SQL), TypeScript, expo-image-picker (base64 nativo), Zustand.

---

## Contexto crítico

Estos elementos del código referencian tablas/RPCs que **NO EXISTEN** en el schema de Supabase:

| Código | Referencia faltante |
|---|---|
| `leaderboard.tsx` | RPC `get_leaderboard` |
| `badges.ts` | Tabla `badges` + `user_badges` |
| `shopping.tsx` | Tabla `shopping_items` |
| `photos.tsx` | Tabla `progress_photos` |
| `body-photo.tsx` + `photos.tsx` | Bucket `hunterfit-body-photos` (schema crea `body-photos`) |
| `FoodIcon` / recetas | Columna `foods.icon` |

Sin la migration estas pantallas fallan silenciosamente o con error 42P01.

---

## Tarea 1: Migration 0008 — Tablas y RPCs faltantes

**Files:**
- Crear: `supabase/migrations/0008_missing_tables.sql`

**Paso 1: Crear el archivo de migration**

```sql
-- 0008_missing_tables.sql
-- Agrega tablas, RPCs y bucket que el código espera pero no están en el schema

-- ============ BADGES (catálogo público) ============
create table if not exists badges (
  id serial primary key,
  slug text unique not null,
  name_es text not null,
  description_es text not null,
  icon text not null default '🏅',
  category text not null default 'general',
  xp_reward integer not null default 50,
  rarity text not null default 'common'
    check (rarity in ('common','rare','epic','legendary'))
);

create table if not exists user_badges (
  id serial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  badge_id integer not null references badges(id),
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

alter table badges enable row level security;
alter table user_badges enable row level security;
create policy "read badges" on badges for select to authenticated using (true);
create policy "own user_badges" on user_badges for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Seed: definiciones de badges (slugs que usa badges.ts)
insert into badges (slug, name_es, description_es, icon, category, xp_reward, rarity) values
  ('first_workout',  'Primera misión',        'Completa tu primer entrenamiento',      '⚔️',  'workout',  100, 'common'),
  ('workouts_10',    'Guerrero constante',     '10 entrenamientos completados',         '🔥',  'workout',  200, 'common'),
  ('workouts_50',    'Cazador dedicado',       '50 entrenamientos completados',         '💪',  'workout',  500, 'rare'),
  ('workouts_100',   'Leyenda del gimnasio',   '100 entrenamientos completados',        '🏆',  'workout', 1000, 'epic'),
  ('sets_100',       'Rey de las series',      '100 series completadas',                '💯',  'workout',  300, 'common'),
  ('volume_10k',     'Volumen máximo',         '10,000 kg de volumen total levantado',  '🦾',  'workout',  500, 'rare'),
  ('streak_3',       'Racha de fuego',         '3 días consecutivos activo',            '🔥',  'streak',   150, 'common'),
  ('streak_7',       'Semana perfecta',        '7 días consecutivos activo',            '⚡',  'streak',   300, 'rare'),
  ('streak_30',      'Mes imparable',          '30 días consecutivos activo',           '💥',  'streak',   800, 'epic'),
  ('streak_100',     'Centurión',              '100 días consecutivos activo',          '👑',  'streak',  2000, 'legendary'),
  ('first_meal',     'Primera comida',         'Registra tu primera comida',            '🍽️',  'nutrition', 50, 'common'),
  ('meals_7days',    'Nutrición constante',    '7 días registrando comidas',            '🥗',  'nutrition', 200, 'common'),
  ('meals_30days',   'Dieta maestra',          '30 días registrando comidas',           '🧬',  'nutrition', 600, 'rare'),
  ('recipes_5',      'Chef cazador',           '5 recetas generadas con IA',            '👨‍🍳', 'nutrition', 250, 'rare'),
  ('level_5',        'Nivel 5',               'Alcanza el nivel 5',                    '⭐',  'level',    200, 'common'),
  ('level_10',       'Nivel 10',              'Alcanza el nivel 10',                   '🌟',  'level',    400, 'rare'),
  ('level_25',       'Nivel 25',              'Alcanza el nivel 25',                   '💫',  'level',   1000, 'epic'),
  ('steps_10k',      '10K pasos',             '10,000 pasos en un día',                '🚶',  'steps',    150, 'common'),
  ('steps_50k',      'Maratonista',           '50,000 pasos acumulados',               '🏃',  'steps',    400, 'rare'),
  ('rank_d',         'Rango D',               'Alcanza el Rango D',                    '🔵',  'rank',     300, 'common'),
  ('rank_c',         'Rango C',               'Alcanza el Rango C',                    '🟣',  'rank',     600, 'rare'),
  ('rank_b',         'Rango B',               'Alcanza el Rango B',                    '🟠',  'rank',    1000, 'epic'),
  ('rank_a',         'Rango A',               'Alcanza el Rango A',                    '🔴',  'rank',    2000, 'epic'),
  ('rank_s',         'Rango S',               'Alcanza el Rango S — el máximo',        '✨',  'rank',    5000, 'legendary'),
  ('top_10',         'Top 10',                'Entra al top 10 del leaderboard',       '🏅',  'social',   500, 'rare'),
  ('top_1',          'El Mejor Cazador',      'Llega al #1 del leaderboard',           '🥇',  'social',  2000, 'legendary')
on conflict (slug) do nothing;

-- ============ SHOPPING ITEMS ============
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  qty_g numeric(7,1),
  category text not null default 'general',
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table shopping_items enable row level security;
create policy "own shopping_items" on shopping_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ PROGRESS PHOTOS ============
create table if not exists progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  storage_path text not null,
  note text,
  weight_kg numeric(5,1),
  taken_at timestamptz not null default now()
);

alter table progress_photos enable row level security;
create policy "own progress_photos" on progress_photos for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ FOODS.ICON (columna para emojis) ============
alter table foods add column if not exists icon text;

-- ============ STORAGE BUCKET hunterfit-body-photos ============
insert into storage.buckets (id, name, public)
  values ('hunterfit-body-photos', 'hunterfit-body-photos', false)
on conflict (id) do nothing;

create policy "own hunterfit body photos" on storage.objects for all to authenticated
  using (
    bucket_id = 'hunterfit-body-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'hunterfit-body-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============ RPC get_leaderboard ============
create or replace function get_leaderboard(limit_n integer default 50)
returns table (
  user_id uuid,
  username text,
  rank hunter_rank,
  level integer,
  xp integer,
  streak_days integer,
  badge_count bigint
)
language sql security definer set search_path = public as $$
  select
    p.id as user_id,
    p.username,
    p.rank,
    p.level,
    p.xp,
    p.streak_days,
    count(ub.id) as badge_count
  from profiles p
  left join user_badges ub on ub.user_id = p.id
  where p.username is not null
  group by p.id, p.username, p.rank, p.level, p.xp, p.streak_days
  order by p.xp desc
  limit limit_n;
$$;
```

**Paso 2: Ejecutar en Supabase**

Ir al Dashboard de Supabase → SQL Editor → pegar y ejecutar.

O bien con CLI si está instalado:
```bash
supabase db push
```

**Paso 3: Verificar**

En Supabase Table Editor verificar que existen: `badges`, `user_badges`, `shopping_items`, `progress_photos`. En Storage verificar el bucket `hunterfit-body-photos`.

**Paso 4: Commit**

```bash
git add supabase/migrations/0008_missing_tables.sql
git commit -m "feat(db): add missing tables badges, user_badges, shopping_items, progress_photos + get_leaderboard RPC"
```

---

## Tarea 2: Fix expo-file-system/legacy en body-photo.tsx

**Files:**
- Modificar: `src/app/onboarding/body-photo.tsx`

La solución limpia: `expo-image-picker` soporta `base64: true` de forma nativa. Elimina la necesidad de leer el archivo después.

**Paso 1: Modificar el import — eliminar FileSystem/legacy**

En `body-photo.tsx` línea 6, eliminar:
```typescript
import * as FileSystem from 'expo-file-system/legacy';
```

**Paso 2: Agregar estado para base64**

Después de `const [photoUri, setPhotoUri] = useState<string | null>(null);` (línea 28), agregar:
```typescript
const [photoBase64, setPhotoBase64] = useState<string | null>(null);
```

**Paso 3: Actualizar pickImage para capturar base64**

Reemplazar la función `pickImage` (líneas 31-38):
```typescript
async function pickImage() {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    aspect: [3, 4],
    quality: 0.7,
    base64: true,
  });
  if (!result.canceled) {
    setPhotoUri(result.assets[0].uri);
    setPhotoBase64(result.assets[0].base64 ?? null);
  }
}
```

**Paso 4: Actualizar handleUploadAndAnalyze para usar state base64**

Reemplazar líneas 49-51 (donde lee el archivo):
```typescript
// ANTES (líneas 49-51):
const base64 = await FileSystem.readAsStringAsync(photoUri, {
  encoding: FileSystem.EncodingType.Base64,
});

// DESPUÉS: usar el base64 ya capturado del picker
if (!photoBase64) throw new Error('No base64 disponible');
const base64 = photoBase64;
```

**Paso 5: Verificar que el archivo compila sin errores**

```bash
cd "d:/TODO/app fitnes/hunterfit"
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sin errores relacionados con `FileSystem` en `body-photo.tsx`.

**Paso 6: Commit**

```bash
git add src/app/onboarding/body-photo.tsx
git commit -m "fix: remove expo-file-system/legacy in body-photo, use ImagePicker base64"
```

---

## Tarea 3: Fix expo-file-system/legacy en photos.tsx

**Files:**
- Modificar: `src/app/profile/photos.tsx`

**Paso 1: Eliminar import de FileSystem/legacy** (línea 6)

```typescript
// ELIMINAR esta línea:
import * as FileSystem from 'expo-file-system/legacy';
```

**Paso 2: Agregar estado para base64**

Después de `const [selectedUri, setSelectedUri] = useState<string | null>(null);` (línea 70):
```typescript
const [selectedBase64, setSelectedBase64] = useState<string | null>(null);
```

**Paso 3: Actualizar pickPhoto para capturar base64**

Reemplazar función `pickPhoto` (líneas 72-80):
```typescript
async function pickPhoto() {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'], quality: 0.75, aspect: [3, 4],
    base64: true,
  });
  if (!result.canceled) {
    setSelectedUri(result.assets[0].uri);
    setSelectedBase64(result.assets[0].base64 ?? null);
    setShowForm(true);
  }
}
```

**Paso 4: Actualizar handleSave para usar selectedBase64**

Reemplazar líneas 86-88:
```typescript
// ANTES:
const base64 = await FileSystem.readAsStringAsync(selectedUri, {
  encoding: FileSystem.EncodingType.Base64,
});

// DESPUÉS:
if (!selectedBase64) throw new Error('No base64 disponible');
const base64 = selectedBase64;
```

**Paso 5: Limpiar estado en cancelar y después de guardar**

En el éxito (después de `setNote('')` línea 98):
```typescript
setSelectedBase64(null);
```

En el cancelar (en el `onPress` del botón "Cancelar"):
```typescript
onPress={() => { setShowForm(false); setSelectedUri(null); setSelectedBase64(null); }}
```

**Paso 6: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep photos
```

Esperado: sin errores.

**Paso 7: Commit**

```bash
git add src/app/profile/photos.tsx
git commit -m "fix: remove expo-file-system/legacy in progress photos, use ImagePicker base64"
```

---

## Tarea 4: Crear purchaseService.ts (mock RevenueCat)

**Files:**
- Crear: `src/services/purchases.ts`

**Paso 1: Crear el archivo**

```typescript
import { supabase } from '../lib/supabase';

export type PlanId = 'monthly' | 'annual' | 'lifetime';

export interface PurchaseResult {
  success: boolean;
  error?: string;
}

/** Mock de RevenueCat — reemplazar con SDK real antes de producción */
export async function purchasePlan(planId: PlanId, userId: string): Promise<PurchaseResult> {
  // Simular latencia de red/store
  await new Promise((r) => setTimeout(r, 1500));

  try {
    // En producción: llamar RevenueCat SDK aquí
    // const purchaserInfo = await Purchases.purchasePackage(package);

    // Mock: marcar premium en Supabase
    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Error al procesar el pago' };
  }
}

export async function restorePurchases(userId: string): Promise<PurchaseResult> {
  await new Promise((r) => setTimeout(r, 1000));

  // Mock: en producción llamar Purchases.restorePurchases()
  // Por ahora: verificar en Supabase si ya tiene premium
  const { data } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .single();

  if (data?.is_premium) {
    return { success: true };
  }
  return { success: false, error: 'No se encontró ninguna compra anterior' };
}
```

**Paso 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep purchases
```

Esperado: sin errores.

**Paso 3: Commit**

```bash
git add src/services/purchases.ts
git commit -m "feat: add purchaseService mock (RevenueCat placeholder)"
```

---

## Tarea 5: Conectar upgrade.tsx a purchaseService

**Files:**
- Modificar: `src/app/premium/upgrade.tsx`

**Paso 1: Agregar imports**

Después del import de `useHunterData` (línea 8), agregar:
```typescript
import { useAuth } from '../../hooks/useAuth';
import { purchasePlan, restorePurchases, type PlanId } from '../../services/purchases';
```

**Paso 2: Agregar estado de compra**

Dentro de `UpgradeScreen`, después de `const [timeLeft...` (línea 80):
```typescript
const { userId } = useAuth();
const [purchasing, setPurchasing] = useState(false);
```

**Paso 3: Agregar función handlePurchase**

Antes del `return (`:
```typescript
async function handlePurchase() {
  if (!userId || purchasing) return;
  setPurchasing(true);
  try {
    const result = await purchasePlan(selectedPlan as PlanId, userId);
    if (result.success) {
      Alert.alert(
        '¡Bienvenido a Hunter Pro! 👑',
        'Tu membresía está activa. ¡A cazar metas!',
        [{ text: 'Continuar', onPress: () => router.replace('/(tabs)/home') }]
      );
    } else {
      Alert.alert('Error', result.error ?? 'No se pudo completar la compra');
    }
  } finally {
    setPurchasing(false);
  }
}

async function handleRestore() {
  if (!userId || purchasing) return;
  setPurchasing(true);
  try {
    const result = await restorePurchases(userId);
    if (result.success) {
      Alert.alert('Compra restaurada', 'Tu acceso premium ha sido restaurado.');
    } else {
      Alert.alert('Sin compras', result.error ?? 'No se encontró ninguna compra anterior');
    }
  } finally {
    setPurchasing(false);
  }
}
```

**Paso 4: Conectar botón CTA (línea 187)**

Reemplazar:
```typescript
// ANTES:
<Pressable onPress={() => {/* TODO: RevenueCat */}}>

// DESPUÉS:
<Pressable onPress={handlePurchase} disabled={purchasing}>
```

Y cambiar el texto del botón para reflejar loading:
```typescript
// Dentro del LinearGradient del CTA, reemplazar el texto:
<SystemText style={{ fontSize: 17, fontWeight: '900', color: purchasing ? '#00000080' : '#000' }}>
  {purchasing ? 'Procesando…' : `Obtener Hunter Pro — ${selected.price}${selected.period}`}
</SystemText>
```

**Paso 5: Conectar botón Restaurar (línea 243)**

Reemplazar:
```typescript
// ANTES:
<Pressable onPress={() => {/* TODO: RevenueCat restore */}} style={{ alignItems: 'center' }}>

// DESPUÉS:
<Pressable onPress={handleRestore} disabled={purchasing} style={{ alignItems: 'center' }}>
```

**Paso 6: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep upgrade
```

Esperado: sin errores.

**Paso 7: Commit**

```bash
git add src/app/premium/upgrade.tsx
git commit -m "feat: connect upgrade screen to purchaseService mock"
```

---

## Tarea 6: Gate premium en body-photo + eliminar PremiumPaywall.tsx muerto

**Files:**
- Modificar: `src/app/onboarding/body-photo.tsx`
- Eliminar: `src/components/PremiumPaywall.tsx` (no está importado en ningún lado)

**Paso 1: Agregar import de useHunterData en body-photo.tsx**

Después del import de `useUpdateProfile` (línea 9):
```typescript
import { useHunterData } from '../../hooks/useHunterData';
```

**Paso 2: Obtener profile dentro de BodyPhotoScreen**

Después de `const { userId } = useAuth();` (línea 26):
```typescript
const { profile } = useHunterData();
const isPremium = profile?.is_premium ?? false;
```

**Paso 3: Modificar el botón "Analizar con IA"**

Reemplazar el `SystemButton` de "Analizar con IA" (líneas 96-101):
```typescript
<SystemButton
  title={
    uploading
      ? 'Analizando…'
      : isPremium
        ? '✦ Analizar con IA'
        : '👑 Analizar con IA (Premium)'
  }
  variant="gradient"
  loading={uploading}
  onPress={isPremium ? handleUploadAndAnalyze : () => router.push('/premium/upgrade')}
/>
```

**Paso 4: Eliminar PremiumPaywall.tsx**

```bash
rm "d:/TODO/app fitnes/hunterfit/src/components/PremiumPaywall.tsx"
```

Verificar que nada lo importa:
```bash
grep -r "PremiumPaywall" "d:/TODO/app fitnes/hunterfit/src/"
```
Esperado: sin resultados.

**Paso 5: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sin errores nuevos.

**Paso 6: Commit final**

```bash
git add src/app/onboarding/body-photo.tsx
git rm src/components/PremiumPaywall.tsx
git commit -m "feat: gate AI body analysis behind premium, remove unused PremiumPaywall component"
```

---

## Resumen de cambios

| Tarea | Archivos | Impacto |
|---|---|---|
| 1 | `supabase/migrations/0008_missing_tables.sql` | 🔴 Crítico — Activa leaderboard, badges, shopping, fotos |
| 2 | `src/app/onboarding/body-photo.tsx` | 🔴 Crítico — Fix crash en análisis de foto |
| 3 | `src/app/profile/photos.tsx` | 🔴 Crítico — Fix crash en fotos de progreso |
| 4 | `src/services/purchases.ts` (nuevo) | 🟠 Alto — Habilita flujo de compra |
| 5 | `src/app/premium/upgrade.tsx` | 🟠 Alto — Conecta UI de compra al servicio |
| 6 | `src/app/onboarding/body-photo.tsx` + eliminar PremiumPaywall | 🟡 Medio — Protege feature premium |

## Orden de ejecución recomendado

1 → 2 → 3 → 4 → 5 → 6 (en ese orden, son dependencias lineales)

La Tarea 1 (migration) NO necesita código — es SQL puro en el dashboard de Supabase.
