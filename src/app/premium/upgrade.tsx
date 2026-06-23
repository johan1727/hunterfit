import React, { useState, useEffect, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, Pressable, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useHunterData } from '../../hooks/useHunterData';
import {
  AuroraBackground, GradientText, SystemPanel, SystemWindowPanel, SystemText,
} from '../../components/system';
import { colors, gradients, radius, spacing } from '../../theme/system';

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
    badge: '🔥 MÁS POPULAR',
    saving: 'Ahorra 47%',
  },
  {
    id: 'lifetime',
    label: 'De por vida',
    price: '$1,299',
    period: 'pago único',
    pricePerDay: null,
    highlight: false,
    badge: '💎 MEJOR VALOR',
  },
];

const FEATURES_FREE = [
  '✅ Rutinas básicas con 1 personaje',
  '✅ Registro de alimentos (DB completa)',
  '✅ Misiones diarias y semanales',
  '✅ Leaderboard global',
  '✅ Podómetro y pasos diarios',
  '❌ Análisis de foto con IA',
  '❌ Plan de comidas personalizado con IA',
  '❌ Todos los personajes desbloqueados',
  '❌ Badges exclusivos premium',
  '❌ Soporte prioritario',
];

const FEATURES_PREMIUM = [
  '✅ Todo lo del plan gratis',
  '✅ Análisis de foto con IA (ilimitado)',
  '✅ Plan de comidas semanal con IA',
  '✅ 6 personajes + sus 3 formas',
  '✅ Badges y rangos exclusivos premium',
  '✅ Sin anuncios',
  '✅ Historial ilimitado de entrenamientos',
  '✅ Exportar datos a Excel/PDF',
  '✅ Soporte prioritario 24/7',
];

const TESTIMONIALS = [
  { name: 'Carlos M.', city: 'CDMX', text: 'En 3 meses bajé 8kg siguiendo el plan de la app. La IA de fotos es un game changer.', stars: 5 },
  { name: 'Ana P.', city: 'Guadalajara', text: 'Finalmente una app de gym que se siente como un juego. No puedo dejar de subir de rango.', stars: 5 },
  { name: 'Diego R.', city: 'Monterrey', text: 'El plan de comidas con IA me ahorra horas a la semana. Vale cada peso.', stars: 5 },
];

export default function UpgradeScreen() {
  const router = useRouter();
  const { profile } = useHunterData();
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [timeLeft, setTimeLeft] = useState({ h: 2, m: 47, s: 33 });
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Countdown timer (oferta por tiempo limitado)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) return { h: 0, m: 0, s: 0 };
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Pulse animation para el CTA
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');
  const selected = PLANS.find((p) => p.id === selectedPlan)!;

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
            <SystemText style={{ fontSize: 12, fontWeight: '900', color: '#FFD700' }}>
              ⚡ HUNTER PRO
            </SystemText>
          </View>
        </View>

        {/* Hero */}
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <SystemText style={{ fontSize: 52 }}>👑</SystemText>
          <GradientText style={{ fontSize: 32, fontWeight: '900', textAlign: 'center', lineHeight: 36 }}>
            Desbloquea todo{'\n'}tu potencial
          </GradientText>
          <SystemText dim style={{ fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
            Únete a +12,000 cazadores que ya alcanzaron su mejor versión con Hunter Pro
          </SystemText>
        </View>

        {/* Oferta por tiempo limitado */}
        <LinearGradient colors={['#FF6B35', '#FF3366']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.ofertaBanner}>
          <SystemText style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>
            ⏰ OFERTA DE LANZAMIENTO — TERMINA EN:
          </SystemText>
          <View style={styles.countdown}>
            {[{ v: timeLeft.h, l: 'h' }, { v: timeLeft.m, l: 'm' }, { v: timeLeft.s, l: 's' }].map((t, i) => (
              <React.Fragment key={t.l}>
                <View style={styles.countdownUnit}>
                  <SystemText style={{ color: '#fff', fontWeight: '900', fontSize: 24 }}>{pad(t.v)}</SystemText>
                  <SystemText style={{ color: '#ffffff80', fontSize: 10 }}>{t.l}</SystemText>
                </View>
                {i < 2 && <SystemText style={{ color: '#fff', fontWeight: '900', fontSize: 20 }}>:</SystemText>}
              </React.Fragment>
            ))}
          </View>
        </LinearGradient>

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
          <Pressable onPress={() => {/* TODO: RevenueCat */}}>
            <LinearGradient colors={['#FFD700', '#FF6B35']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}>
              <SystemText style={{ fontSize: 17, fontWeight: '900', color: '#000' }}>
                Obtener Hunter Pro — {selected.price}{selected.period}
              </SystemText>
              {selected.id === 'annual' && (
                <SystemText style={{ fontSize: 12, color: '#000', opacity: 0.7 }}>
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
          <SystemText style={{ fontWeight: '800', fontSize: 15, textAlign: 'center' }}>
            Gratis vs Hunter Pro
          </SystemText>
          <View style={{ gap: 8 }}>
            {FEATURES_PREMIUM.map((f, i) => {
              const free = FEATURES_FREE[i] ?? '❌ No incluido';
              const isFreeOk = free.startsWith('✅');
              return (
                <View key={i} style={styles.compareRow}>
                  <SystemText style={{ flex: 1, fontSize: 13, color: isFreeOk ? colors.text : colors.textDim }}>
                    {free}
                  </SystemText>
                  <SystemText style={{ flex: 1, fontSize: 13, color: '#4AE3B5' }}>{f}</SystemText>
                </View>
              );
            })}
          </View>
        </SystemWindowPanel>

        {/* Testimonios */}
        <SystemText style={{ fontWeight: '800', fontSize: 15, textAlign: 'center' }}>
          Lo que dicen los cazadores
        </SystemText>
        {TESTIMONIALS.map((t) => (
          <SystemPanel key={t.name} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <SystemText style={{ fontWeight: '700', fontSize: 14 }}>{t.name}</SystemText>
              <SystemText dim style={{ fontSize: 13 }}>{t.city}</SystemText>
            </View>
            <SystemText style={{ fontSize: 13 }}>{'⭐'.repeat(t.stars)}</SystemText>
            <SystemText dim style={{ fontSize: 13, lineHeight: 20, fontStyle: 'italic' }}>"{t.text}"</SystemText>
          </SystemPanel>
        ))}

        {/* Restore */}
        <Pressable onPress={() => {/* TODO: RevenueCat restore */}} style={{ alignItems: 'center' }}>
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
        <SystemText style={{ fontWeight: '900', fontSize: 20, color: selected ? '#fff' : colors.text }}>
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
    backgroundColor: '#FFD70020', borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#FFD70040',
  },
  ofertaBanner: {
    borderRadius: radius.lg, padding: spacing.md,
    alignItems: 'center', gap: spacing.sm,
  },
  countdown: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  countdownUnit: { alignItems: 'center', minWidth: 36 },
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
  compareRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 4 },
  savingBadge: {
    backgroundColor: '#4AE3B520', borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 2, marginTop: 2,
    borderWidth: 1, borderColor: '#4AE3B540',
  },
});
