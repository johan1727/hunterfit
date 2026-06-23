import React, { useState, useEffect, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, Pressable, Platform, AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Pedometer } from 'expo-sensors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { localDateString } from '../../lib/dates';
import {
  AuroraBackground, GradientText, SystemPanel, SystemWindowPanel,
  SystemText, SystemButton, ProgressBar,
} from '../../components/system';
import { colors, gradients, radius, spacing } from '../../theme/system';

const STEP_GOAL = 8000;
const STEPS_PER_XP = 1000; // 1 XP per 1000 steps batch
const CALORIES_PER_STEP = 0.04; // kcal aproximado

export default function HealthScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const qc = useQueryClient();

  const [steps, setSteps] = useState(0);
  const [pedometerAvail, setPedometerAvail] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<boolean | null>(null);
  const subRef = useRef<any>(null);
  const lastXpGrantedSteps = useRef(0);

  // Historial de pasos de Supabase
  const { data: stepLog } = useQuery({
    queryKey: ['step_log', userId, localDateString()],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('step_logs')
        .select('*')
        .eq('user_id', userId!)
        .eq('date', localDateString())
        .single();
      return data;
    },
  });

  const saveStepsMutation = useMutation({
    mutationFn: async (totalSteps: number) => {
      if (!userId) return;
      const kcal = Math.round(totalSteps * CALORIES_PER_STEP * 10) / 10;
      const distance_m = Math.round(totalSteps * 0.75); // ~75cm por paso
      const { error } = await supabase
        .from('step_logs')
        .upsert(
          { user_id: userId, date: localDateString(), steps: totalSteps, calories: kcal, distance_m, source: 'pedometer' },
          { onConflict: 'user_id,date' }
        );
      if (error) throw error;
      // XP cada 1000 pasos
      const batches = Math.floor(totalSteps / STEPS_PER_XP);
      const prevBatches = Math.floor(lastXpGrantedSteps.current / STEPS_PER_XP);
      const newBatches = batches - prevBatches;
      if (newBatches > 0) {
        await supabase.rpc('grant_xp', { amount: newBatches * 5 });
        lastXpGrantedSteps.current = totalSteps;
        qc.invalidateQueries({ queryKey: ['profile', userId] });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['step_log', userId, localDateString()] }),
  });

  useEffect(() => {
    let mounted = true;
    Pedometer.isAvailableAsync().then((avail) => {
      if (!mounted) return;
      setPedometerAvail(avail);
      if (!avail) return;

      Pedometer.requestPermissionsAsync().then(({ granted }) => {
        if (!mounted) return;
        setPermission(granted);
        if (!granted) return;

        // Pasos del día actual (desde medianoche)
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);

        Pedometer.getStepCountAsync(start, now).then(({ steps: s }) => {
          if (mounted) {
            setSteps(s);
            lastXpGrantedSteps.current = s;
          }
        }).catch(() => {});

        // Suscripción live
        subRef.current = Pedometer.watchStepCount((result) => {
          if (mounted) setSteps(result.steps);
        });
      });
    });

    return () => {
      mounted = false;
      subRef.current?.remove?.();
    };
  }, []);

  // Guarda en Supabase cuando cambian los pasos (debounced via AppState)
  useEffect(() => {
    if (!userId || steps === 0) return;
    const t = setTimeout(() => saveStepsMutation.mutate(steps), 10_000);
    return () => clearTimeout(t);
  }, [steps]);

  // Sync cuando la app vuelve al frente
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && userId && steps > 0) {
        saveStepsMutation.mutate(steps);
      }
    });
    return () => sub.remove();
  }, [steps, userId]);

  const progress = Math.min(steps / STEP_GOAL, 1);
  const kcalBurned = Math.round(steps * CALORIES_PER_STEP);
  const distanceKm = (steps * 0.00075).toFixed(2);
  const xpEarned = Math.floor(steps / STEPS_PER_XP) * 5;

  const savedSteps = stepLog?.steps ?? 0;
  const weekProgress = stepLog ? [savedSteps] : [];

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.textDim} />
          </Pressable>
          <GradientText style={{ fontSize: 28, fontWeight: '900' }}>Salud</GradientText>
        </View>

        {/* Status sensor */}
        {pedometerAvail === false && (
          <SystemPanel style={{ borderColor: '#FF6B3540' }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <Ionicons name="warning-outline" size={20} color="#FF6B35" />
              <View style={{ flex: 1 }}>
                <SystemText style={{ fontWeight: '700', color: '#FF6B35', fontSize: 14 }}>
                  Podómetro no disponible
                </SystemText>
                <SystemText dim style={{ fontSize: 13 }}>
                  {Platform.OS === 'android'
                    ? 'Requiere Android 10+ o dispositivo con sensor de pasos.'
                    : 'Requiere iPhone con M7 o posterior.'}
                </SystemText>
              </View>
            </View>
          </SystemPanel>
        )}

        {pedometerAvail && permission === false && (
          <SystemPanel style={{ borderColor: '#FFD16640' }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <Ionicons name="lock-closed-outline" size={20} color="#FFD166" />
              <View style={{ flex: 1 }}>
                <SystemText style={{ fontWeight: '700', color: '#FFD166', fontSize: 14 }}>
                  Permiso denegado
                </SystemText>
                <SystemText dim style={{ fontSize: 13 }}>
                  Ve a Ajustes → HunterFit → Actividad física y habilita el acceso.
                </SystemText>
              </View>
            </View>
          </SystemPanel>
        )}

        {/* Pasos del día — card principal */}
        <SystemWindowPanel style={{ gap: spacing.md, alignItems: 'center' }}>
          {/* Ring visual con número */}
          <View style={styles.ringWrap}>
            <LinearGradient
              colors={progress >= 1 ? ['#4AE3B5', '#6B8FFF'] : gradients.brand as any}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.ringGrad}
            >
              <View style={styles.ringInner}>
                <SystemText style={{ fontSize: 42, fontWeight: '900', color: colors.text, lineHeight: 48 }}>
                  {steps.toLocaleString('es')}
                </SystemText>
                <SystemText dim style={{ fontSize: 13 }}>pasos hoy</SystemText>
              </View>
            </LinearGradient>
          </View>

          <View style={{ width: '100%', gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <SystemText dim style={{ fontSize: 13 }}>Meta diaria: {STEP_GOAL.toLocaleString('es')}</SystemText>
              <SystemText style={{ fontSize: 13, fontWeight: '700', color: progress >= 1 ? '#4AE3B5' : colors.text }}>
                {Math.round(progress * 100)}%
              </SystemText>
            </View>
            <ProgressBar progress={progress} height={8} />
            {progress >= 1 && (
              <SystemText style={{ fontSize: 13, color: '#4AE3B5', fontWeight: '700', textAlign: 'center' }}>
                ¡Meta alcanzada! 🎉
              </SystemText>
            )}
          </View>
        </SystemWindowPanel>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { icon: '🔥', label: 'Calorías', value: `${kcalBurned} kcal` },
            { icon: '📍', label: 'Distancia', value: `${distanceKm} km` },
            { icon: '⚡', label: 'XP ganado', value: `+${xpEarned} XP` },
          ].map((s) => (
            <SystemPanel key={s.label} style={styles.statCard}>
              <SystemText style={{ fontSize: 22 }}>{s.icon}</SystemText>
              <SystemText style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>
                {s.value}
              </SystemText>
              <SystemText dim style={{ fontSize: 12 }}>{s.label}</SystemText>
            </SystemPanel>
          ))}
        </View>

        {/* Info sobre XP */}
        <SystemPanel style={{ gap: 4 }}>
          <SystemText style={{ fontWeight: '700', fontSize: 14 }}>⚡ XP por pasos</SystemText>
          <SystemText dim style={{ fontSize: 13, lineHeight: 20 }}>
            Gana +5 XP por cada 1,000 pasos. Los pasos se sincronizan automáticamente en tiempo real usando el sensor del dispositivo.
          </SystemText>
          <View style={{ height: 1, backgroundColor: colors.panelBorder, marginVertical: spacing.xs }} />
          <SystemText dim style={{ fontSize: 13 }}>
            Meta actual: {STEP_GOAL.toLocaleString('es')} pasos = {(STEP_GOAL / STEPS_PER_XP) * 5} XP máximo diario
          </SystemText>
        </SystemPanel>

        {/* Dev Build info */}
        <SystemPanel style={{ gap: spacing.sm, borderColor: '#6B8FFF40' }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <Ionicons name="information-circle-outline" size={20} color="#6B8FFF" />
            <SystemText style={{ fontWeight: '700', fontSize: 14, color: '#6B8FFF', flex: 1 }}>
              Sincronización completa con Health
            </SystemText>
          </View>
          <SystemText dim style={{ fontSize: 13, lineHeight: 20 }}>
            Para sincronizar con Apple Health o Google Fit (calorías, frecuencia cardíaca, sueño), se requiere un Dev Build de Expo — es gratis y solo toma ~10 minutos. El podómetro actual funciona sin instalación adicional.
          </SystemText>
        </SystemPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  backBtn: { padding: 8 },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringGrad: {
    width: 180, height: 180, borderRadius: 90,
    padding: 4, alignItems: 'center', justifyContent: 'center',
  },
  ringInner: {
    width: 172, height: 172, borderRadius: 86,
    backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.md },
});
