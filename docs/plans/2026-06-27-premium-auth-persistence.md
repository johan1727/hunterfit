# Premium Fitia + Auth/Persistencia + Claims verdaderas — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rehacer los planes premium al estilo Fitia (Normal/Familiar × Mensual/Anual, sin "de por vida"), hacer que la comparativa premium solo prometa lo que la app realmente entrega, y garantizar que sin sesión válida no se intenten escrituras a la nube (arreglar los 403) mostrando un aviso claro para iniciar sesión.

**Architecture:** Cambios quirúrgicos en `premium/upgrade.tsx` + `services/purchases.ts` para los planes; auditoría feature-by-feature con gating `is_premium` (reutilizando `PremiumPaywall`) para alinear claims con realidad; un guard transversal de escrituras Supabase (`requireAuth`) + componente `LoginPrompt` para el aviso. Sin tests unitarios (el proyecto no tiene runner — `package.json` solo tiene `lint`); verificación por `tsc --noEmit` + Playwright (modo demo y cuenta de prueba) + revisión manual.

**Tech Stack:** Expo SDK 56, expo-router, Supabase (schema `hunterfit`), React Query, Ionicons, react-native-svg. Servidor web ya corriendo en `localhost:8081`.

---

## Context (hallazgos de la investigación)

- **Planes actuales** (`premium/upgrade.tsx`, `services/purchases.ts`): `monthly`/`annual`/`lifetime`. `purchasePlan` es un **mock** que setea `profiles.is_premium = true` en Supabase (requiere sesión). El usuario añadió wiring `useAuth` + `purchasePlan` + `Alert`.
- **Premium aspiracional** — claims que la app NO cumple hoy:
  - **Foto IA** (`analyzeFoodPhoto` en `search.tsx > handleAnalyzePhoto`) **no está gated** por premium → cualquier usuario no-demo la usa.
  - **Meal-plan IA** (`nutrition/meal-plan.tsx`) sin gate `is_premium`.
  - **Personajes** (`onboarding/character-select.tsx`) sin bloqueo premium → "todos los personajes" no se cobra.
  - **Sin anuncios / Export Excel-PDF / Soporte 24/7 / Historial ilimitado**: no existen en el código.
  - Único gate real: `onboarding/body-photo.tsx` (análisis corporal) y el CTA en `profile.tsx` (`!profile?.is_premium`).
  - Existe `components/PremiumPaywall.tsx` huérfano (emojis viejos, precio `$3.99`).
- **403 Forbidden** en `workout_sets` y `user_badges`: el guard raíz (`_layout.tsx > RootNavigator`) solo deja entrar a `(tabs)` si `isDemo` o hay `session`. Las escrituras (`workout/[id].tsx > saveSetLogs`, `services/badges.ts > checkAndAwardBadges`) se disparan con sesión presente pero RLS las rechaza → política INSERT ausente/incorrecta o sesión inválida. `handleComplete` ya guarda `isDemo`; `saveSetLogs` guarda `!userId`.
- **Signup** (`auth/signup.tsx`) muestra "Revisa tu correo para confirmar la cuenta" → **email confirmation probablemente activado** en Supabase. Riesgo para "crear+loguear" una cuenta de prueba sin acceso al correo.
- **Decisiones del usuario:** (1) hacer las claims verdaderas; (2) exigir login + aviso (demo efímero); (3) planes Normal $79/mes·$499/año + Familiar (hasta 6) $129/mes·$799/año con toggle Mensual/Anual.

---

## Task 1: Planes Fitia (Normal/Familiar × Mensual/Anual)

**Files:**
- Modify: `src/services/purchases.ts`
- Modify: `src/app/premium/upgrade.tsx`

**Step 1.1 — Nuevos PlanId y precios (`purchases.ts`):**
```ts
export type PlanId = 'normal_monthly' | 'normal_annual' | 'family_monthly' | 'family_annual';
```
`purchasePlan(planId, userId)` se mantiene (mock → `is_premium = true`); añadir `is_family` cuando el plan sea familiar:
```ts
const isFamily = planId.startsWith('family_');
const { error } = await supabase.from('profiles')
  .update({ is_premium: true, ...(isFamily ? { is_family: true } : {}) })
  .eq('id', userId);
```
*(Si `profiles.is_family` no existe, omitir ese campo — ver Task 5 backlog para la migración.)*

**Step 1.2 — Reestructurar `PLANS` en `upgrade.tsx`** a matriz por periodo:
```tsx
const PERIODS = [
  { key: 'monthly', label: 'Mensual' },
  { key: 'annual',  label: 'Anual' },
] as const;
const PLAN_MATRIX = {
  monthly: [
    { id: 'normal_monthly', label: 'Normal',  price: '$79',  period: '/mes', sub: 'Para ti', badge: null },
    { id: 'family_monthly', label: 'Familiar', price: '$129', period: '/mes', sub: 'Hasta 6 personas', badge: 'FAMILIAR' },
  ],
  annual: [
    { id: 'normal_annual', label: 'Normal',  price: '$499', period: '/año', sub: '$1.37/día', badge: 'AHORRA 47%' },
    { id: 'family_annual', label: 'Familiar', price: '$799', period: '/año', sub: 'Hasta 6 · $2.19/día', badge: 'MÁS POPULAR' },
  ],
} as const;
```

**Step 1.3 — UI:** añadir un `SegmentedTabs` (Mensual/Anual) arriba del selector (reutilizar `src/components/SegmentedTabs.tsx`). Estado:
```tsx
const [period, setPeriod] = useState<'monthly'|'annual'>('annual');
const plans = PLAN_MATRIX[period];
const [selectedPlan, setSelectedPlan] = useState<PlanId>('family_annual');
// al cambiar period, si el selectedPlan no está en plans, seleccionar el primero
```
Renderizar las 2 tarjetas de `plans` (mismo `PlanContent`/estilos actuales). Quitar `lifetime` por completo.

**Step 1.4 — Arreglar nit del badge** (`planBadge` se solapa con el precio): mover el precio a una segunda línea o bajar el badge (`top: -10 → -8` y reservar `paddingRight` en la fila de precio). Verificar en captura.

**Verificación:** `npx tsc --noEmit` limpio; en `localhost:8081` (cuenta de prueba, Task 4) abrir `/premium/upgrade` → toggle Mensual/Anual cambia las 2 tarjetas Normal/Familiar; badge no se solapa.

---

## Task 2: Claims premium verdaderas (gating + comparativa real)

**Objetivo:** que la comparativa solo prometa lo que la app entrega; gatear con `is_premium` lo que existe, quitar/marcar "Próximamente" lo que no.

**Files:**
- Modify: `src/app/nutrition/search.tsx` (gate foto IA)
- Modify: `src/app/nutrition/meal-plan.tsx` (gate meal-plan IA)
- Modify: `src/app/onboarding/character-select.tsx` (gate personajes premium)
- Modify: `src/app/premium/upgrade.tsx` (COMPARISON real)
- Reference: `src/components/PremiumPaywall.tsx`, `src/hooks/useHunterData.ts`

**Step 2.1 — Helper de gating.** En `useHunterData` (o un hook nuevo `usePremium`), exponer `isPremium = profile?.is_premium ?? false`. 

**Step 2.2 — Gate Foto IA** (`search.tsx > handleAnalyzePhoto`): al inicio, si `!isPremium && !isDemo` → `router.push('/premium/upgrade')` y `return`. (En demo, mantener el Alert actual.)

**Step 2.3 — Gate Meal-plan IA** (`meal-plan.tsx`): si `!isPremium`, mostrar `PremiumPaywall feature="Plan de comidas con IA"` en lugar del generador (o redirigir al abrir).

**Step 2.4 — Gate Personajes premium** (`character-select.tsx`): definir cuáles son free (p.ej. el 1º) vs premium; en los premium, si `!isPremium`, mostrar candado y redirigir a upgrade al seleccionar. *(Si se decide no gatear personajes, quitar esa fila de la comparativa.)*

**Step 2.5 — COMPARISON real** (`upgrade.tsx`): reescribir para reflejar lo entregable. Quitar/`comingSoon`:
```tsx
const COMPARISON = [
  { label: 'Rutinas personalizadas', free: true },
  { label: 'Registro de alimentos (DB completa)', free: true },
  { label: 'Misiones diarias y semanales', free: true },
  { label: 'Leaderboard global', free: true },
  { label: 'Podómetro y pasos diarios', free: true },
  { label: 'Análisis de foto con IA', free: false },
  { label: 'Plan de comidas semanal con IA', free: false },
  { label: 'Análisis de composición corporal', free: false },
  { label: 'Todos los personajes + formas', free: false },
  { label: 'Plan Familiar (hasta 6)', free: false },
  // Eliminados (no entregables hoy): 'Sin anuncios', 'Exportar Excel/PDF', 'Soporte 24/7', 'Historial ilimitado'
];
```
Render: si se quiere conservar alguno como roadmap, añadir `comingSoon?: boolean` y badge "Pronto" en gris (no como check verde).

**Verificación:** en cuenta free, intentar Foto IA / Meal-plan → redirige a `/premium/upgrade`. La comparativa no lista features inexistentes. `tsc` limpio.

---

## Task 3: Persistencia con auth + aviso + arreglar 403

**Objetivo:** ninguna escritura a Supabase sin sesión válida; aviso claro "Inicia sesión para guardar"; demo explícitamente efímero.

**Files:**
- Create: `src/components/LoginPrompt.tsx`
- Create: `src/lib/requireAuth.ts`
- Modify (auditoría de escrituras): `src/app/workout/[id].tsx`, `src/services/badges.ts`, `src/services/quests.ts`, `src/hooks/useData.ts`, `src/app/nutrition/*` (inserts de `meal_logs`, `water_logs`, `weight_logs`, `favorite_meals`)

**Step 3.1 — `requireAuth` helper:**
```ts
import { supabase } from './supabase';
/** Devuelve userId si hay sesión válida; null si no. Úsalo antes de cualquier write. */
export async function getValidUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}
```

**Step 3.2 — Guardar TODAS las escrituras.** Auditar cada `supabase.from(...).insert/update/upsert/delete` en la lista de archivos. Patrón:
```ts
const uid = await getValidUserId();
if (!uid) { /* skip + marcar para LoginPrompt */ return; }
```
Prioridad (sitios del 403): `workout/[id].tsx > saveSetLogs` y `services/badges.ts > checkAndAwardBadges` deben no ejecutarse sin `uid` válido (no solo `userId` de props, que puede estar desincronizado del token).

**Step 3.3 — `LoginPrompt` (aviso):** banner/panel reutilizable:
```tsx
// props: { message?: string }
// "Inicia sesión para guardar tu progreso" + botón "Crear cuenta / Entrar" → router.push('/auth/login')
```
Mostrarlo donde el guardado importa y el usuario está en demo (Home, Nutrición, Workouts ya tienen banner demo — unificar el copy para que diga explícitamente "los datos no se guardan en modo exploración").

**Step 3.4 — Investigar RLS (requiere acceso Supabase).** Con la cuenta de prueba logueada (Task 4), reproducir el 403 y revisar políticas de `hunterfit.workout_sets` y `hunterfit.user_badges`:
- Confirmar que existe policy **INSERT** con `WITH CHECK (auth.uid() = user_id)` (no solo `USING`).
- `user_badges`: verificar que tenga policy de INSERT (puede faltar del todo → default deny = 403).
- **Nota:** el MCP de Supabase está desconectado en esta sesión; este paso necesita reconectar el MCP o el dashboard. Documentar la policy correcta como migración `supabase/migrations/` aunque no se pueda aplicar aquí.

**Verificación:** en demo, completar un workout / registrar agua → **cero** requests POST a Supabase (revisar Network en el navegador) y aparece el aviso. Con cuenta logueada, las escrituras devuelven 200 (tras corregir RLS).

---

## Task 4: Cuenta de prueba + login (para verificar Tasks 1–3)

**Files:** ninguno (operación runtime con Playwright).

**Step 4.1 — Detectar si email confirmation está activo.** Vía Playwright en `/auth/signup`, crear `hunterfit.test+<n>@gmail.com` / pass `test1234`. Tras "Crear cuenta", intentar login inmediato en `/auth/login`.
- Si login **funciona** → confirmation está OFF; continuar.
- Si login **falla** ("Email not confirmed") → **BLOQUEO**: requiere que el usuario (a) desactive "Confirm email" en Supabase Auth settings, o (b) confirme el correo, o (c) reconecte el MCP de Supabase para crear el usuario con `email_confirm: true`. Reportar y pausar.

**Step 4.2 — Completar onboarding** (quiz/character) con el usuario nuevo para llegar a `(tabs)` y poder probar workouts/premium reales.

**Step 4.3 — Verificación visual** (Playwright, viewport 414): capturar `/premium/upgrade` (toggle + planes), `/workouts` (hero de semana ahora SÍ visible logueado), y reproducir el flujo de guardado (sin 403).

**Verificación:** capturas en el scratchpad; el hero de semana de Workouts renderiza con cuenta real; premium muestra los 4 planes.

---

## Task 5: "Qué más falta" — backlog priorizado

Convertir en issues/tareas (no necesariamente en este plan):
1. **RevenueCat real**: `purchases.ts` es un mock; integrar SDK + productos store antes de cobrar de verdad.
2. **Migración `profiles.is_family`** (y/o tabla de miembros del plan familiar + invitaciones) si se quiere que "Familiar" signifique algo funcional.
3. **RLS**: políticas INSERT de `workout_sets` y `user_badges` (Task 3.4) como migración versionada.
4. **Confirmación de email**: UX in-app (reenviar correo / estado "pendiente") o desactivar confirmation para MVP.
5. **`PremiumPaywall` huérfano**: actualizar (quitar emojis/`$3.99`) y reutilizar, o borrar.
6. **Features prometidas no construidas** (si algún día se re-prometen): export Excel/PDF, sistema de anuncios para free, límite/“ilimitado” de historial, soporte.
7. **Nits visuales**: emoji "🤖 Generar Receta con IA" en `nutrition.tsx`; errores tsc preexistentes (`numberOfLines` en `SystemText`) en leaderboard/badges/history.
8. **Glifos residuales** fuera de alcance previo: `recipe.tsx`, `meal-plan.tsx`.

---

## Orden recomendado

1. **Task 4** (cuenta de prueba) — desbloquea verificación real de todo lo demás. Si email-confirm bloquea, resolver primero.
2. **Task 1** (planes Fitia) — aislado, visible.
3. **Task 2** (claims verdaderas) — depende de gating.
4. **Task 3** (persistencia/aviso/403) — el más transversal.
5. **Task 5** (backlog) — documentar, no implementar todo.

## Verificación final

1. `npx tsc --noEmit` (desde `hunterfit/`) → sin errores nuevos vs baseline (26 preexistentes).
2. Playwright: demo → cero POST a Supabase + aviso visible; cuenta real → premium con 4 planes y toggle, foto IA/meal-plan piden upgrade en free, workout guarda sin 403.
3. Commit por task (planes / claims / auth-persistencia) y push a `origin/main`.

## Riesgos

- **Email confirmation** (Task 4) puede bloquear el login automático — necesita acción en Supabase.
- **RLS del 403** (Task 3.4) necesita acceso a Supabase (MCP desconectado) para arreglar de raíz; el lado app (guards + aviso) sí se puede hacer ahora.
- Cambio grande → commits separados por task para revert limpio.
