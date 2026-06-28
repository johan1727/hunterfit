// Stub para web / Expo Go: RevenueCat usa módulos nativos (IAP) que no existen
// en web. Metro resuelve revenuecat.native.ts en iOS/Android y este archivo en web.
// Cuando RC_ENABLED es false, purchases.ts usa el flujo mock.
import type { PlanId } from '../services/purchases';

export const RC_ENABLED = false;

export function initRevenueCat(_userId?: string | null): void {}

export async function getPlanPrices(): Promise<Partial<Record<PlanId, string>>> {
  return {};
}

export async function purchaseViaRevenueCat(
  _planId: PlanId,
): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
  return { ok: false, error: 'Las compras solo están disponibles en la app móvil' };
}

export async function restoreViaRevenueCat(): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: 'No disponible en web' };
}
