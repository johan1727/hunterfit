import { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useDemoStore } from '../../lib/demoStore';
import { useGrantXp } from '../../hooks/useData';
import { supabase } from '../../lib/supabase';
import { localDateString } from '../../lib/dates';
import { colors, gradients, radius, spacing } from '../../theme/system';
import { AuroraBackground, SystemText, SystemButton } from '../../components/system';
import { LinearGradient } from 'expo-linear-gradient';

type OFFProduct = {
  product_name?: string;
  nutriments?: {
    energy_kcal_100g?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
};

async function lookupBarcode(barcode: string): Promise<OFFProduct | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const json = await res.json();
    if (json.status === 1 && json.product) return json.product;
    return null;
  } catch {
    return null;
  }
}

export default function BarcodeScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; type?: string }>();
  const { userId } = useAuth();
  const isDemo = useDemoStore((s) => s.isDemo);
  const grantXp = useGrantXp(userId);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<{ name: string; kcal: number; protein: number; carbs: number; fat: number } | null>(null);

  const logDate = params.date ?? localDateString();
  const mealType = params.type ?? 'comida';

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.root}>
        <AuroraBackground />
        <View style={styles.center}>
          <SystemText style={{ fontSize: 16, textAlign: 'center', marginBottom: spacing.lg }}>
            Se necesita acceso a la cámara para escanear códigos de barras
          </SystemText>
          <SystemButton title="Dar permiso" variant="gradient" onPress={requestPermission} />
          <SystemButton title="← Volver" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.sm }} />
        </View>
      </SafeAreaView>
    );
  }

  async function handleBarcode({ data }: { data: string }) {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    try {
      const product = await lookupBarcode(data);
      if (!product || !product.product_name) {
        Alert.alert(
          'Producto no encontrado',
          `Código: ${data}\nNo está en la base de datos de Open Food Facts.`,
          [{ text: 'Escanear otro', onPress: () => setScanned(false) }],
        );
        return;
      }
      const n = product.nutriments ?? {};
      setFound({
        name: product.product_name,
        kcal: Math.round(n.energy_kcal_100g ?? 0),
        protein: Math.round((n.proteins_100g ?? 0) * 10) / 10,
        carbs: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
        fat: Math.round((n.fat_100g ?? 0) * 10) / 10,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!found || isDemo) return;
    try {
      const { error } = await supabase.from('meal_logs').insert({
        user_id: userId,
        date: logDate,
        meal_type: mealType,
        custom_name: found.name,
        quantity_g: 100,
        kcal: found.kcal,
        protein_g: found.protein,
        carbs_g: found.carbs,
        fat_g: found.fat,
        source: 'barcode',
      });
      if (error) throw error;
      grantXp.mutate(10);
      router.replace('/(tabs)/nutrition');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el alimento');
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />

      {!found ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={[StyleSheet.absoluteFill]}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }}
            onBarcodeScanned={scanned ? undefined : handleBarcode}
          />

          {/* Overlay */}
          <View style={styles.overlay}>
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.scanFrame}>
                {/* Esquinas */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                {loading && (
                  <View style={styles.scanningLabel}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Buscando…</Text>
                  </View>
                )}
              </View>
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom}>
              <SystemText dim style={{ textAlign: 'center', fontSize: 13 }}>
                Apunta al código de barras del producto
              </SystemText>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <SystemText style={{ color: colors.text, fontSize: 14 }}>← Volver</SystemText>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          <LinearGradient
            colors={gradients.brand as any}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.foundCard}
          >
            <Text style={styles.foundName}>{found.name}</Text>
            <View style={styles.foundMacros}>
              <MacroChip label="kcal" value={`${found.kcal}`} color="#fff" />
              <MacroChip label="P" value={`${found.protein}g`} color="#FDA4AF" />
              <MacroChip label="C" value={`${found.carbs}g`} color="#FCD34D" />
              <MacroChip label="G" value={`${found.fat}g`} color="#67E8F9" />
            </View>
            <Text style={styles.foundSub}>por 100g</Text>
          </LinearGradient>

          <View style={{ gap: spacing.sm, marginTop: spacing.lg, width: '100%', paddingHorizontal: spacing.lg }}>
            <SystemButton title="Agregar a mis comidas" variant="gradient" onPress={handleSave} />
            <SystemButton
              title="Escanear otro"
              variant="ghost"
              onPress={() => { setFound(null); setScanned(false); }}
            />
            <SystemButton title="← Volver" variant="ghost" onPress={() => router.back()} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function MacroChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.macroChip}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const OVERLAY_COLOR = 'rgba(7,8,11,0.72)';
const FRAME = 220;
const CORNER = 20;
const CORNER_W = 3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },

  cameraWrap: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, flexDirection: 'column' },
  overlayTop: { flex: 1, backgroundColor: OVERLAY_COLOR },
  overlayMiddle: { flexDirection: 'row', height: FRAME },
  overlaySide: { flex: 1, backgroundColor: OVERLAY_COLOR },
  overlayBottom: { flex: 1, backgroundColor: OVERLAY_COLOR, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingTop: spacing.lg },
  scanFrame: { width: FRAME, height: FRAME, position: 'relative' },

  corner: { position: 'absolute', width: CORNER, height: CORNER },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderColor: gradients.brand[0] },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderColor: gradients.brand[0] },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderColor: gradients.brand[0] },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderColor: gradients.brand[0] },

  scanningLabel: {
    position: 'absolute', bottom: 12, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  backBtn: {
    paddingVertical: 10, paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.pill,
  },

  foundCard: {
    width: '100%', borderRadius: radius.lg,
    padding: spacing.xl, alignItems: 'center', gap: spacing.md,
  },
  foundName: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  foundSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  foundMacros: { flexDirection: 'row', gap: spacing.md },
  macroChip: { alignItems: 'center', gap: 2 },
  macroValue: { fontSize: 18, fontWeight: '900' },
  macroLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
});
