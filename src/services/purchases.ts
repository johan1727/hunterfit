import { supabase } from '../lib/supabase';

export type PlanId = 'normal_monthly' | 'normal_annual' | 'family_monthly' | 'family_annual';

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
  const { data, error } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .single();
  if (error) return { success: false, error: error.message };

  if (data?.is_premium) {
    return { success: true };
  }
  return { success: false, error: 'No se encontró ninguna compra anterior' };
}
