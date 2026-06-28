import { supabase } from '../lib/supabase';

export type PlanId = 'normal_monthly' | 'normal_annual' | 'family_monthly' | 'family_annual';

export interface PurchaseResult {
  success: boolean;
  error?: string;
}

/**
 * Entitlements: marca premium en Supabase y registra la suscripción.
 * MOCK de la compra (sin cobro real). Cuando se integre RevenueCat, el SDK
 * llamará a esta misma función con source='revenuecat' tras validar el pago.
 */
export async function grantEntitlement(
  planId: PlanId,
  userId: string,
  source: 'mock' | 'revenuecat' = 'mock',
): Promise<PurchaseResult> {
  try {
    const isFamily = planId.startsWith('family_');
    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: true, is_family: isFamily, plan_id: planId, plan_source: source })
      .eq('id', userId);
    if (error) throw error;
    // Historial (no bloquea la compra si falla)
    await supabase.from('subscriptions').insert({ user_id: userId, plan_id: planId, source, status: 'active' });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Error al procesar el pago' };
  }
}

/** Mock de RevenueCat — reemplazar el cobro real con el SDK antes de producción. */
export async function purchasePlan(planId: PlanId, userId: string): Promise<PurchaseResult> {
  // Simular latencia de red/store
  await new Promise((r) => setTimeout(r, 1500));
  // En producción: await Purchases.purchasePackage(pkg) y luego grantEntitlement(..., 'revenuecat')
  return grantEntitlement(planId, userId, 'mock');
}

export async function restorePurchases(userId: string): Promise<PurchaseResult> {
  await new Promise((r) => setTimeout(r, 1000));
  // Mock: en producción llamar Purchases.restorePurchases()
  const { data, error } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .single();
  if (error) return { success: false, error: error.message };
  if (data?.is_premium) return { success: true };
  return { success: false, error: 'No se encontró ninguna compra anterior' };
}
