# Cierre de pendientes HunterFit (RevenueCat + gestión + calidad) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: usar superpowers:executing-plans para ejecutar task-by-task.

**Goal:** Cerrar los pendientes de la app: integrar RevenueCat real (Expo) sin romper el mock web, completar la gestión del plan Familiar (cancelar), UX de confirmación de email, expiración de plan, limpieza, y verificar lo cableado. El arte restante queda gateado por la cuota de Canva.

**Architecture:** RevenueCat se integra detrás de un guard de plataforma (solo native); en web sigue el mock. `grantEntitlement()` (ya existe) es el punto único donde aterriza la compra, venga del mock o de RevenueCat. El resto son cambios quirúrgicos + RPCs Supabase.

**Tech Stack:** Expo SDK 56, react-native-purchases, Supabase (schema hunterfit), expo-router. Verificación: `tsc --noEmit` + REST/MCP para RPCs + Playwright (web, para lo no-RC). RevenueCat NO se prueba en web — requiere EAS dev build.

**Datos RevenueCat (provistos):**
- Framework: **Expo** (react-native-purchases). Proyecto "HUNTER" (Apple + Android).
- SDK key de prueba (público, va en el cliente): `test_vybLDeWfMqPMJUqfEVLPArKNfAk`
- Repo iOS SPM (NO usar — es para Swift nativo): `purchases-ios-spm.git`

---

## Context (estado actual)

- `src/services/purchases.ts` → `grantEntitlement(planId, userId, source)` escribe `profiles` (is_premium, is_family, plan_id, plan_source) + tabla `subscriptions`. `purchasePlan()` es mock (1.5s) → grantEntitlement(..., 'mock'). `restorePurchases()` revisa is_premium.
- Plan Familiar completo: `create_family_invite`, `redeem_family_invite`, `get_family_members`, `leave_family`, `remove_family_member`. **Falta: cancelar plan (dueño).**
- `auth/signup.tsx` solo muestra "Revisa tu correo" — sin reenvío ni estado.
- `profiles.plan_expires_at` existe pero nadie lo setea/lee.
- 14 `console.*` en workout/[id], fasting, recipeAI, search.
- Feature de voz (`micBtn` en search.tsx) — estilo arreglado; falta verificar wiring.
- Foto completa en detalle de personaje (character-select) — cableada, sin verificación visual.
- Arte: Kael+Ragnar reales; faltan Yuki/Ren/Aria/Kenta + nuevas Selene/Freya (cuota Canva).

---

## Task 1: RevenueCat (Expo) — compra real en native, mock en web

**Files:** Create `src/lib/revenuecat.ts`; Modify `src/services/purchases.ts`, `src/app/premium/upgrade.tsx`, `.env`, `app.json`/`app.config`.

**Step 1.1 — Instalar SDK**
```bash
cd hunterfit && npx expo install react-native-purchases
```
(Opcional paywall nativo: `react-native-purchases-ui` — NO necesario, ya tenemos paywall custom en upgrade.tsx.)

**Step 1.2 — Key en env** (`.env`): la key pública va en el cliente; usar `EXPO_PUBLIC_`:
```
EXPO_PUBLIC_REVENUECAT_KEY=test_vybLDeWfMqPMJUqfEVLPArKNfAk
```
*(Luego: `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (appl_…) y `_ANDROID_KEY` (goog_…) por plataforma.)*

**Step 1.3 — `src/lib/revenuecat.ts`** (init + helpers, guard de plataforma):
```ts
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

export const RC_ENABLED = Platform.OS === 'ios' || Platform.OS === 'android';

export function initRevenueCat(appUserId?: string) {
  if (!RC_ENABLED) return; // web/Expo Go: usar mock
  Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_KEY!, appUserID: appUserId });
}

// Mapea el plan_id de la app -> identificador del Package/Product en RevenueCat.
export async function getPackageForPlan(planId: string): Promise<PurchasesPackage | null> {
  if (!RC_ENABLED) return null;
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return null;
  // Convención: el "identifier" del package === planId (configurar así en el dashboard).
  return current.availablePackages.find((p) => p.identifier === planId)
      ?? current.availablePackages.find((p) => p.product.identifier.includes(planId))
      ?? null;
}
```

**Step 1.4 — Inicializar al cargar la app** (`src/app/_layout.tsx`, dentro de un `useEffect` en RootLayout con el userId de sesión):
```ts
// initRevenueCat(session?.user?.id) cuando hay sesión y RC_ENABLED
```

**Step 1.5 — `purchases.ts`: compra real en native, mock en web**
```ts
import { RC_ENABLED, getPackageForPlan } from '../lib/revenuecat';
import Purchases from 'react-native-purchases';

export async function purchasePlan(planId: PlanId, userId: string): Promise<PurchaseResult> {
  if (!RC_ENABLED) { await new Promise(r=>setTimeout(r,1200)); return grantEntitlement(planId, userId, 'mock'); }
  try {
    const pkg = await getPackageForPlan(planId);
    if (!pkg) return { success:false, error:'Plan no disponible en la tienda' };
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = Object.keys(customerInfo.entitlements.active).length > 0;
    if (!active) return { success:false, error:'La compra no se completó' };
    return grantEntitlement(planId, userId, 'revenuecat'); // sincroniza Supabase
  } catch (e:any) {
    if (e?.userCancelled) return { success:false, error:'Compra cancelada' };
    return { success:false, error: e?.message ?? 'Error en la compra' };
  }
}

export async function restorePurchases(userId: string): Promise<PurchaseResult> {
  if (!RC_ENABLED) { /* mock actual: revisar is_premium en Supabase */ }
  else {
    const info = await Purchases.restorePurchases();
    if (Object.keys(info.entitlements.active).length === 0) return { success:false, error:'Sin compras' };
    // (opcional) derivar planId del entitlement y grantEntitlement(...,'revenuecat')
    return { success:true };
  }
}
```

**Step 1.6 — Dashboard RevenueCat (manual, tú):** crear una Offering con packages cuyo `identifier` sea exactamente `normal_monthly`, `normal_annual`, `family_monthly`, `family_annual`, ligados a productos de App Store/Play (o al test store para sandbox). Un entitlement "pro".

**Verificación:** `tsc --noEmit` limpio. En **web** la compra sigue mock (verificable en localhost). En **device** (EAS dev build) la compra abre el flujo de RevenueCat → al completar, `profiles.is_premium=true` y `plan_source='revenuecat'`. **No testeable en web.**

**Riesgo:** requiere `npx expo prebuild` + EAS dev build; productos creados en las tiendas. Documentar que web queda en mock.

---

## Task 2: Cancelar plan Familiar (dueño)

**Files:** Migration (MCP) + `src/services/family.ts` + `src/app/premium/family.tsx`.

**Step 2.1 — RPC `cancel_family_plan()`** (SECURITY DEFINER): el dueño disuelve el grupo; los miembros con `plan_source='family_invite'` pierden premium; el dueño conserva su premium individual pero `is_family=false`. Borra family_invites + family_members + family_groups del dueño.

**Step 2.2 — `family.ts`:** `cancelFamilyPlan()` → `supabase.rpc('cancel_family_plan')`.

**Step 2.3 — UI:** botón "Cancelar plan Familiar" (rojo, con confirm) visible solo para el dueño.

**Verificación:** REST: dueño cancela → grupo borrado, miembros revertidos. `tsc` limpio.

---

## Task 3: Confirmación de email in-app

**Files:** Modify `src/app/auth/signup.tsx`, `src/app/auth/login.tsx`.

**Step 3.1 — Signup:** tras `signUp`, mostrar estado "pendiente" con botón **"Reenviar correo"** → `supabase.auth.resend({ type: 'signup', email })`. Mensaje claro.

**Step 3.2 — Login:** si el login falla con "Email not confirmed", mostrar CTA "Reenviar confirmación".

**Verificación:** signup muestra estado + reenvío funciona (no error). `tsc` limpio.

---

## Task 4: Expiración de plan (`plan_expires_at`)

**Files:** Modify `src/services/purchases.ts` (mock) + opcional check.

**Step 4.1 — Mock:** en `grantEntitlement`, setear `plan_expires_at` = ahora + (1 mes si `*_monthly`, 1 año si `*_annual`). En RevenueCat real, derivar de `customerInfo.entitlements.active[..].expirationDate`.

**Step 4.2 — Check (opcional):** helper `isPremiumActive(profile)` = `is_premium && (plan_expires_at == null || plan_expires_at > now)`. Usarlo en los gates en vez de solo `is_premium`.

**Verificación:** comprar (mock) setea expiración; `tsc` limpio.

---

## Task 5: Verificar lo cableado (foto detalle + voz)

**Files:** ninguno (verificación) — o fixes si fallan.

**Step 5.1 — Foto completa en detalle** (character-select): Playwright web → login → Perfil → Cambiar personaje → click Kael → screenshot; confirmar que el detalle muestra la imagen completa.

**Step 5.2 — Voz en buscador** (`micBtn` en search.tsx): revisar el handler de grabación (expo-av / speech-to-text). Si está incompleto, completarlo o ocultar el botón hasta tenerlo. Revisar el plan `docs/plans/2026-06-27-search-voice-body-fasting.md`.

**Verificación:** capturas + handler funcional o botón oculto.

---

## Task 6: Limpieza para producción

**Files:** `src/app/workout/[id].tsx`, `src/app/nutrition/fasting.tsx`, `src/services/recipeAI.ts`, `src/app/nutrition/search.tsx`.

**Step 6.1 — Quitar `console.log/error` de debug** (dejar solo logging intencional de errores con contexto, o envolver en `if (__DEV__)`).

**Verificación:** grep sin `console.log` de debug; `tsc` limpio.

---

## Task 7: Arte restante (BLOQUEADO por cuota Canva)

**Files:** `assets/characters/*`, `src/constants/game.ts`, DB seed.

Cuando vuelva la cuota: generar Yuki, Maestro Ren, Aria, Kenta + Selene/Freya (limpias) → recortar con PIL → copiar a `assets/` → agregar slug a `CHARS_WITH_ART` + requires en `game.ts`. Agregar Selene/Freya a `hunterfit.characters` (archetype/routine_bias/unlock_rank). Luego formas awakened/final.

**Verificación:** la selección muestra arte de todos; sin emoji.

---

## Task 8 (opcional): Gating de personajes premium

Si se decide vender personajes: marcar cuáles son premium (columna o constante), candado en `character-select` para no-premium → redirige a upgrade. Si no, dejar como está (la comparativa ya no lo promete).

---

## Orden recomendado

1. **Task 2** (cancelar familiar — cierra la gestión, rápido).
2. **Task 3** (email — UX importante, web-testeable).
3. **Task 4** (expiración — pequeño).
4. **Task 6** (limpieza — rápido).
5. **Task 5** (verificar foto/voz).
6. **Task 1** (RevenueCat — el más grande; en paralelo tú creas productos/offerings en el dashboard; no testeable en web).
7. **Task 7** (arte) cuando vuelva Canva.

## Verificación final
- `tsc --noEmit` sin errores nuevos.
- Web (localhost): familiar cancelable, email reenvío, compra mock con expiración, foto detalle OK.
- Device (EAS): RevenueCat compra real → Supabase sincronizado.
- Commit por task y push a `origin/main`.

## Riesgos
- **RevenueCat solo en device** (EAS dev build + productos en tiendas). Web/Expo Go = mock. Es la pieza con más dependencias externas (tu lado).
- La key `test_` es sandbox; en producción usar las keys `appl_`/`goog_` reales.
