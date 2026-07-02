import { supabase } from '../lib/supabase';
import { RC_ENABLED, purchaseViaRevenueCat, restoreViaRevenueCat, getPlanPrices as rcGetPlanPrices } from '../lib/revenuecat';

export type PlanId = 'normal_monthly' | 'normal_annual' | 'family_monthly' | 'family_annual';

export interface PurchaseResult {
  success: boolean;
  error?: string;
}

/**
 * Entitlements: marca premium en Supabase y registra la suscripción vía el RPC
 * `apply_entitlement` (SECURITY DEFINER) — profiles ya no acepta UPDATE directo
 * de columnas de plan/premium desde el cliente.
 * MOCK de la compra (sin cobro real). Cuando se integre RevenueCat, el SDK
 * llamará a esta misma función con source='revenuecat' tras validar el pago.
 */
export async function grantEntitlement(
  planId: PlanId,
  _userId: string,
  source: 'mock' | 'revenuecat' = 'mock',
): Promise<PurchaseResult> {
  try {
    // Mock: la expiración se estima localmente. Con RevenueCat real, derivarla de
    // customerInfo.entitlements.active[..].expirationDate.
    const expires = new Date();
    if (planId.endsWith('_annual')) expires.setFullYear(expires.getFullYear() + 1);
    else expires.setMonth(expires.getMonth() + 1);
    const expiresAt = expires.toISOString();

    const { error } = await supabase.rpc('apply_entitlement', {
      p_plan_id: planId,
      p_expires_at: expiresAt,
      p_source: source,
    });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Error al procesar el pago' };
  }
}

/**
 * Compra un plan. En device (iOS/Android) usa RevenueCat real; en web usa mock.
 * El éxito aterriza SIEMPRE en grantEntitlement (sincroniza Supabase).
 */
export async function purchasePlan(planId: PlanId, userId: string): Promise<PurchaseResult> {
  if (RC_ENABLED) {
    const r = await purchaseViaRevenueCat(planId);
    if (!r.ok) return { success: false, error: r.cancelled ? 'Compra cancelada' : (r.error ?? 'No se pudo completar la compra') };
    return grantEntitlement(planId, userId, 'revenuecat');
  }
  // Web/Expo Go: mock (sin cobro)
  await new Promise((r) => setTimeout(r, 1200));
  return grantEntitlement(planId, userId, 'mock');
}

/**
 * Precios localizados desde la tienda (RevenueCat `product.priceString`).
 * En web/Expo Go devuelve `{}` → la UI usa sus precios de respaldo.
 */
export async function getPlanPrices(): Promise<Partial<Record<PlanId, string>>> {
  if (!RC_ENABLED) return {};
  return rcGetPlanPrices();
}

export async function restorePurchases(userId: string): Promise<PurchaseResult> {
  if (RC_ENABLED) {
    const r = await restoreViaRevenueCat();
    if (!r.ok) return { success: false, error: r.error ?? 'No se encontró ninguna compra anterior' };
    // Hay entitlement activo en la tienda → reflejarlo en Supabase (RPC, no toca plan_id/plan_expires_at)
    const { error } = await supabase.rpc('apply_entitlement', {
      p_plan_id: null,
      p_expires_at: null,
      p_source: 'revenuecat',
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }
  // Web/Expo Go: mock — revisar si ya es premium en Supabase
  await new Promise((r) => setTimeout(r, 800));
  const { data, error } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .single();
  if (error) return { success: false, error: error.message };
  if (data?.is_premium) return { success: true };
  return { success: false, error: 'No se encontró ninguna compra anterior' };
}
