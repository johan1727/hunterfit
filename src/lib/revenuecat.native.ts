// Implementación real de RevenueCat para iOS/Android (Metro la prioriza por la
// extensión .native). En web se usa revenuecat.ts (stub).
// Requiere un EAS dev build (no funciona en Expo Go).
import Purchases, { LOG_LEVEL, type PurchasesStoreProduct, type PurchasesPackage } from 'react-native-purchases';
import type { PlanId } from '../services/purchases';

export const RC_ENABLED = true;

// Key pública del SDK (segura en el cliente). Preferir la específica de iOS si existe.
const KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
  process.env.EXPO_PUBLIC_REVENUECAT_KEY ||
  '';

const ALL_PLAN_IDS: PlanId[] = ['normal_monthly', 'normal_annual', 'family_monthly', 'family_annual'];

let configured = false;

export function initRevenueCat(userId?: string | null): void {
  if (configured || !KEY) return;
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: KEY, appUserID: userId ?? undefined });
  configured = true;
}

// Busca el producto/paquete cuyo identificador coincide con el planId.
// 1) vía Offering actual (recomendado) — 2) fallback a producto directo.
async function findPurchasable(
  planId: PlanId,
): Promise<{ pkg: PurchasesPackage } | { product: PurchasesStoreProduct } | null> {
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (p) => p.identifier === planId || p.product.identifier === planId,
    );
    if (pkg) return { pkg };
  } catch {
    // sin offering configurada → fallback a productos
  }
  const products = await Purchases.getProducts([planId]);
  if (products[0]) return { product: products[0] };
  return null;
}

// Precios localizados (priceString de la App Store/Play) por plan. Lo que falte
// queda fuera del objeto → la UI usa su precio de respaldo.
export async function getPlanPrices(): Promise<Partial<Record<PlanId, string>>> {
  if (!KEY) return {};
  const out: Partial<Record<PlanId, string>> = {};
  try {
    const offerings = await Purchases.getOfferings();
    for (const pkg of offerings.current?.availablePackages ?? []) {
      const byPkg = pkg.identifier as PlanId;
      const byProduct = pkg.product.identifier as PlanId;
      if (ALL_PLAN_IDS.includes(byPkg)) out[byPkg] = pkg.product.priceString;
      else if (ALL_PLAN_IDS.includes(byProduct)) out[byProduct] = pkg.product.priceString;
    }
  } catch {
    // sin offering → se intenta con productos directos abajo
  }
  const missing = ALL_PLAN_IDS.filter((id) => !out[id]);
  if (missing.length) {
    try {
      const products = await Purchases.getProducts(missing);
      for (const p of products) {
        const id = p.identifier as PlanId;
        if (ALL_PLAN_IDS.includes(id)) out[id] = p.priceString;
      }
    } catch {
      // sin conexión a la tienda → se devuelve lo que se haya obtenido
    }
  }
  return out;
}

export async function purchaseViaRevenueCat(
  planId: PlanId,
): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
  if (!KEY) return { ok: false, error: 'RevenueCat no configurado (falta API key)' };
  try {
    const target = await findPurchasable(planId);
    if (!target) return { ok: false, error: 'Producto no disponible en la tienda' };
    const result =
      'pkg' in target
        ? await Purchases.purchasePackage(target.pkg)
        : await Purchases.purchaseStoreProduct(target.product);
    const active = Object.keys(result.customerInfo.entitlements.active).length > 0;
    return active ? { ok: true } : { ok: false, error: 'La compra no activó el acceso' };
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, error: e?.message ?? 'Error al procesar la compra' };
  }
}

export async function restoreViaRevenueCat(): Promise<{ ok: boolean; error?: string }> {
  try {
    const info = await Purchases.restorePurchases();
    return Object.keys(info.entitlements.active).length > 0
      ? { ok: true }
      : { ok: false, error: 'No se encontraron compras anteriores' };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Error al restaurar' };
  }
}
