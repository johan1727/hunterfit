import React, { useState, useEffect, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, Pressable, Animated, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useHunterData } from '../../hooks/useHunterData';
import { useAuth } from '../../hooks/useAuth';
import { purchasePlan, restorePurchases, type PlanId } from '../../services/purchases';
import {
  AuroraBackground, GradientText, SystemWindowPanel, SystemText,
} from '../../components/system';
import { colors, gradients, numeric, radius, spacing } from '../../theme/system';

const PLANS = [
  {
    id: 'monthly',
    label: 'Mensual',
    price: '$79',
    period: '/mes',
    pricePerDay: '$2.63',
    highlight: false,
    badge: null,
  },
  {
    id: 'annual',
    label: 'Anual',
    price: '$499',
    period: '/año',
    pricePerDay: '$1.37',
    highlight: true,
    badge: 'MÁS POPULAR',
    saving: 'Ahorra 47%',
  },
  {
    id: 'lifetime',
    label: 'De por vida',
    price: '$1,299',
    period: 'pago único',
    pricePerDay: null,
    highlight: false,
    badge: 'MEJOR VALOR',
  },
];

// Comparativa Gratis vs Pro. `free` = incluido en el plan gratis (Pro incluye todo).
const COMPARISON = [
  { label: 'Rutinas con 1 personaje', free: true },
  { label: 'Registro de alimentos (DB completa)', free: true },
  { label: 'Misiones diarias y semanales', free: true },
  { label: 'Leaderboard global', free: true },
  { label: 'Podómetro y pasos diarios', free: true },
  { label: 'Análisis de foto con IA (ilimitado)', free: false },
  { label: 'Plan de comidas semanal con IA', free: false },
  { label: 'Todos los personajes + sus 3 formas', free: false },
  { label: 'Badges y rangos exclusivos', free: false },
  { label: 'Sin anuncios', free: false },
  { label: 'Historial ilimitado de entrenamientos', free: false },
  { label: 'Exportar datos a Excel/PDF', free: false },
  { label: 'Soporte prioritario 24/7', free: false },
];

export default function UpgradeScreen() {
  const router = useRouter();
  const { profile } = useHunterData();
  const { userId } = useAuth();
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation para el CTA
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const selected = PLANS.find((p) => p.id === selectedPlan)!;

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

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="close" size={22} color={colors.textDim} />
          </Pressable>
          <View style={styles.proBadge}>
            <Ionicons name="diamond" size={13} color="#FFD700" />
            <SystemText style={{ fontSize: 12, fontWeight: '900', color: '#FFD700' }}>
              HUNTER PRO
            </SystemText>
          </View>
        </View>

        {/* Hero */}
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <View style={styles.heroIcon}>
            <Ionicons name="diamond" size={34} color={colors.glow} />
          </View>
          <GradientText style={{ fontSize: 32, fontWeight: '900', textAlign: 'center', lineHeight: 36 }}>
            Desbloquea todo{'\n'}tu potencial
          </GradientText>
          <SystemText dim style={{ fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
            Análisis con IA, plan de comidas semanal, todos los personajes y más.
          </SystemText>
        </View>

        {/* Plan selector */}
        <View style={{ gap: spacing.sm }}>
          {PLANS.map((plan) => (
            <Pressable key={plan.id} onPress={() => setSelectedPlan(plan.id)}>
              {selectedPlan === plan.id ? (
                <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.planCard, styles.planCardSelected]}>
                  {plan.badge && (
                    <View style={styles.planBadge}>
                      <SystemText style={{ fontSize: 10, fontWeight: '900', color: '#FFD700' }}>{plan.badge}</SystemText>
                    </View>
                  )}
                  <PlanContent plan={plan} selected />
                </LinearGradient>
              ) : (
                <View style={styles.planCard}>
                  {plan.badge && (
                    <View style={[styles.planBadge, { backgroundColor: colors.bgElevated }]}>
                      <SystemText style={{ fontSize: 10, fontWeight: '900', color: colors.textDim }}>{plan.badge}</SystemText>
                    </View>
                  )}
                  <PlanContent plan={plan} selected={false} />
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* CTA */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable onPress={handlePurchase} disabled={purchasing}>
            <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}>
              <SystemText style={[{ fontSize: 17, fontWeight: '900', color: purchasing ? '#00000080' : '#000' }, numeric]}>
                {purchasing ? 'Procesando…' : `Obtener Hunter Pro — ${selected.price}${selected.period}`}
              </SystemText>
              {selected.id === 'annual' && (
                <SystemText style={{ fontSize: 12, color: '#fff', opacity: 0.85 }}>
                  Solo {selected.pricePerDay} por día · Cancela cuando quieras
                </SystemText>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <SystemText dim style={{ fontSize: 11, textAlign: 'center' }}>
          Pago seguro · Sin cargos ocultos · Prueba 7 días gratis
        </SystemText>

        {/* Comparativa */}
        <SystemWindowPanel style={{ gap: spacing.md }}>
          <View style={styles.compareHead}>
            <SystemText style={{ flex: 1, fontWeight: '800', fontSize: 15 }}>
              Gratis vs Pro
            </SystemText>
            <SystemText dim style={styles.compareCol}>Gratis</SystemText>
            <SystemText style={[styles.compareCol, { color: colors.glow }]}>Pro</SystemText>
          </View>
          <View style={{ gap: 10 }}>
            {COMPARISON.map((item, i) => (
              <View key={i} style={styles.compareRow}>
                <SystemText style={{ flex: 1, fontSize: 13 }}>{item.label}</SystemText>
                <View style={styles.compareCol}>
                  <Ionicons
                    name={item.free ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={item.free ? colors.success : colors.textFaint}
                  />
                </View>
                <View style={styles.compareCol}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                </View>
              </View>
            ))}
          </View>
        </SystemWindowPanel>

        {/* Restore */}
        <Pressable onPress={handleRestore} disabled={purchasing} style={{ alignItems: 'center' }}>
          <SystemText dim style={{ fontSize: 13, textDecorationLine: 'underline' }}>
            Restaurar compra anterior
          </SystemText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanContent({ plan, selected }: { plan: typeof PLANS[0]; selected: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <View style={{ flex: 1 }}>
        <SystemText style={{ fontWeight: '800', fontSize: 15, color: selected ? '#fff' : colors.text }}>
          {plan.label}
        </SystemText>
        {plan.pricePerDay && (
          <SystemText style={{ fontSize: 12, color: selected ? '#ffffff90' : colors.textDim }}>
            {plan.pricePerDay}/día
          </SystemText>
        )}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <SystemText style={[{ fontWeight: '900', fontSize: 20, color: selected ? '#fff' : colors.text }, numeric]}>
          {plan.price}
        </SystemText>
        <SystemText style={{ fontSize: 12, color: selected ? '#ffffff80' : colors.textDim }}>
          {plan.period}
        </SystemText>
        {(plan as any).saving && (
          <View style={styles.savingBadge}>
            <SystemText style={{ fontSize: 10, fontWeight: '900', color: '#4AE3B5' }}>
              {(plan as any).saving}
            </SystemText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFD70020', borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#FFD70040',
  },
  heroIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1.5, borderColor: colors.glow + '55',
    shadowColor: colors.glow, shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
  },
  planCard: {
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.panelBorder,
    backgroundColor: colors.bgElevated, padding: spacing.md,
    position: 'relative',
  },
  planCardSelected: { borderColor: 'transparent' },
  planBadge: {
    position: 'absolute', top: -10, right: spacing.md,
    backgroundColor: '#FFD70020', borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: '#FFD70040',
  },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.panelBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#fff' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  ctaBtn: {
    borderRadius: radius.lg, padding: spacing.md + 4,
    alignItems: 'center', gap: 4,
  },
  compareHead: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.panelBorder, paddingBottom: 8 },
  compareCol: { width: 44, textAlign: 'center', alignItems: 'center', fontSize: 11, fontWeight: '800' },
  compareRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: 2 },
  savingBadge: {
    backgroundColor: '#4AE3B520', borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 2, marginTop: 2,
    borderWidth: 1, borderColor: '#4AE3B540',
  },
});
