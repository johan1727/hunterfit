import React, { useState, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, Pressable,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useAuth } from '../../hooks/useAuth';
import { useDemoStore } from '../../lib/demoStore';
import { DEMO_ROUTINES } from '../../lib/demo';
import { supabase } from '../../lib/supabase';
import { useNetworkError } from '../../lib/networkError';
import { completeWorkout } from '../../services/routines';
import { checkAndAwardBadges } from '../../services/badges';
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground,
  GradientText,
  Pill,
  SystemPanel,
  SystemWindowPanel,
  SystemText,
  SystemButton,
  ProgressBar,
  StatRow,
} from '../../components/system';

interface ExerciseSession {
  exercise_id: number;
  name: string;
  sets: number;
  reps?: number;
  seconds?: number;
  rest_seconds: number;
  completed: boolean;
}

interface SetLog {
  exercise_id: number;
  set_number: number;
  reps_done: number | null;
  weight_kg: number | null;
  seconds_done: number | null;
}

function usePersonalRecords(userId: string | null, exerciseId: number | null) {
  const [pr, setPr] = React.useState<{ max_weight: number | null; max_reps: number | null } | null>(null);

  React.useEffect(() => {
    if (!userId || !exerciseId) return;
    supabase
      .from('workout_sets')
      .select('weight_kg, reps_done')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .order('weight_kg', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!data?.length) return;
        const maxWeight = Math.max(...data.map((r) => r.weight_kg ?? 0));
        const maxReps = Math.max(...data.map((r) => r.reps_done ?? 0));
        setPr({ max_weight: maxWeight || null, max_reps: maxReps || null });
      });
  }, [userId, exerciseId]);

  return pr;
}

export default function WorkoutScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const isDemo = useDemoStore((s) => s.isDemo);
  const { handleError } = useNetworkError();
  const { id: routineId } = useLocalSearchParams<{ id: string }>();
  const [routine, setRoutine] = React.useState<{ name: string; focus?: string } | null>(null);
  const [exercises, setExercises] = useState<ExerciseSession[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const startedAt = useRef(new Date());

  React.useEffect(() => {
    if (isDemo) loadDemo();
    else loadFromSupabase();
  }, [routineId]);

  React.useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { setTimerRunning(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  function loadDemo() {
    const found = DEMO_ROUTINES.find((r) => r.id === routineId);
    if (!found) { setLoading(false); return; }
    setRoutine({ name: found.name, focus: (found as any).focus });
    const exs = found.routine_exercises.map((e) => ({
      exercise_id: e.exercise_id,
      name: e.exercise.name_es,
      sets: e.sets,
      reps: e.reps ?? undefined,
      seconds: e.seconds ?? undefined,
      rest_seconds: e.rest_seconds,
      completed: false,
    }));
    setExercises(exs);
    setLoading(false);
  }

  async function loadFromSupabase() {
    try {
      const { data: rout } = await supabase
        .from('routines').select('*').eq('id', routineId).single();
      const { data: exs } = await supabase
        .from('routine_exercises')
        .select('*, exercise:exercises(*)')
        .eq('routine_id', routineId)
        .order('position');
      setRoutine(rout);
      const mapped = exs?.map((e: any) => ({
        exercise_id: e.exercise_id,
        name: e.exercise.name_es,
        sets: e.sets,
        reps: e.reps,
        seconds: e.seconds,
        rest_seconds: e.rest_seconds,
        completed: false,
      })) || [];
      setExercises(mapped);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  const currentEx = exercises[currentIdx];
  const completedCount = exercises.filter((e) => e.completed).length;
  const progress = exercises.length ? completedCount / exercises.length : 0;
  const totalXP = 100 + exercises.length * 5;

  function markCompleteAndNext() {
    // Marca las series como hechas (sin registro de peso — solo guía)
    const newLogs: SetLog[] = Array.from({ length: currentEx.sets }, (_, i) => ({
      exercise_id: currentEx.exercise_id,
      set_number: i + 1,
      reps_done: currentEx.reps ?? null,
      weight_kg: null,
      seconds_done: currentEx.seconds ?? null,
    }));
    setSetLogs((prev) => [...prev, ...newLogs]);

    const updated = [...exercises];
    updated[currentIdx].completed = true;
    setExercises(updated);
    setTimer(0);
    setTimerRunning(false);

    const nextIdx = currentIdx + 1;
    if (nextIdx < exercises.length) {
      setCurrentIdx(nextIdx);
    }
  }

  function toggleTimer() {
    if (!timerRunning && timer === 0) {
      setTimer(currentEx.rest_seconds);
      setTimerRunning(true);
    } else {
      setTimerRunning(!timerRunning);
    }
  }

  async function saveSetLogs(allLogs: SetLog[]) {
    if (!userId || !allLogs.length) return;
    const rows = allLogs.map((l) => ({
      user_id: userId,
      session_id: sessionId.current,
      routine_id: routineId,
      exercise_id: l.exercise_id,
      set_number: l.set_number,
      reps_done: l.reps_done,
      weight_kg: l.weight_kg,
      seconds_done: l.seconds_done,
    }));
    await supabase.from('workout_sets').insert(rows);
  }

  async function handleComplete() {
    if (isDemo) {
      Alert.alert('¡Excelente!', `Entrenamiento completado · +${totalXP} XP`, [
        { text: 'Volver', onPress: () => router.replace('/(tabs)/home') },
      ]);
      return;
    }
    try {
      setCompleting(true);
      const exercisesCompleted = exercises.map((e) => ({
        exercise_id: e.exercise_id,
        sets_done: e.sets,
      }));
      const durationSecs = Math.floor((Date.now() - startedAt.current.getTime()) / 1000);
      await Promise.all([
        completeWorkout(userId!, routineId as string, startedAt.current, exercisesCompleted, totalXP),
        saveSetLogs(setLogs),
      ]);

      // Chequear badges de workout
      const { data: statsData } = await supabase
        .from('workout_sets')
        .select('session_id, set_number, weight_kg, reps_done')
        .eq('user_id', userId!);
      const sessions = new Set((statsData ?? []).map((r: any) => r.session_id));
      const totalSets = (statsData ?? []).length;
      const totalVolume = (statsData ?? []).reduce((acc: number, r: any) =>
        acc + (r.weight_kg ?? 0) * (r.reps_done ?? 0), 0);
      const { data: profileData } = await supabase
        .from('profiles').select('level,rank,streak_days').eq('id', userId!).single();
      await checkAndAwardBadges(userId!, {
        totalWorkouts: sessions.size,
        totalSets,
        totalVolume,
        level: profileData?.level ?? 1,
        rank: profileData?.rank ?? 'E',
        streakDays: profileData?.streak_days ?? 0,
      });

      Alert.alert('¡Misión cumplida!', `+${totalXP} XP ganados\n⏱ ${Math.floor(durationSecs / 60)} min`, [
        { text: 'OK', onPress: () => router.replace('/(tabs)/home') },
      ]);
    } catch (err: any) {
      const handled = handleError(err, 'Guardar tu entrenamiento');
      if (!handled) {
        Alert.alert('Error', 'No se pudo completar el entrenamiento');
      }
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <AuroraBackground />
        <View style={styles.loadingWrap}>
          <SystemText dim>Cargando entrenamiento...</SystemText>
        </View>
      </SafeAreaView>
    );
  }

  // ── Pantalla de completado ────────────────────────────────────────────────────
  if (!currentEx || (completedCount === exercises.length && exercises.length > 0)) {
    const totalSets = exercises.reduce((a, e) => a + e.sets, 0);
    const setsWithWeight = setLogs.filter((s) => s.weight_kg).length;
    const totalVolume = setLogs.reduce((a, s) => a + (s.weight_kg ?? 0) * (s.reps_done ?? 0), 0);

    return (
      <SafeAreaView style={styles.root}>
        <AuroraBackground />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.completeHeader}>
            <Pill dotColor={colors.success}>Entrenamiento completo</Pill>
            <GradientText
              colors={[colors.success, gradients.brand[0]] as [string, string]}
              style={styles.completeTitle}
            >
              ¡Misión{'\n'}Cumplida!
            </GradientText>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <LinearGradient
              colors={gradients.brand as any}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.xpBadgeWrap}
            >
              <View style={styles.xpBadgeInner}>
                <SystemText style={styles.xpBadgeLabel}>XP GANADOS</SystemText>
                <GradientText style={styles.xpBadgeValue}>+{totalXP}</GradientText>
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).springify()}>
            <SystemPanel style={styles.summaryPanel}>
              <StatRow label="Ejercicios completados" value={exercises.length} />
              <StatRow label="Series totales" value={totalSets} />
              {totalVolume > 0 && (
                <StatRow label="Volumen total" value={`${totalVolume.toLocaleString('es-MX')} kg`} />
              )}
              {setsWithWeight > 0 && (
                <StatRow label="Sets con peso" value={setsWithWeight} />
              )}
              <StatRow label="Rutina" value={routine?.name ?? '—'} />
            </SystemPanel>
          </Animated.View>

          <SystemButton
            title="Confirmar y volver al inicio"
            variant="gradient"
            loading={completing}
            onPress={handleComplete}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Pantalla de ejercicio activo ─────────────────────────────────────────────
  const timerLabel = timerRunning
    ? `⏸  ${timer}s`
    : timer === 0
    ? `▶  Descanso ${currentEx.rest_seconds}s`
    : `▶  ${timer}s`;

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />

      <View style={styles.topBar}>
        <ProgressBar progress={progress} height={5} />
        <View style={styles.topBarRow}>
          <SystemText dim style={styles.topBarText}>{routine?.name}</SystemText>
          <SystemText dim style={styles.topBarText}>
            {completedCount + 1} / {exercises.length}
          </SystemText>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Ejercicio hero */}
          <SystemWindowPanel style={styles.exerciseCard}>
            <Pill dotColor={colors.glow}>{currentEx.reps ? 'Fuerza' : 'Tiempo'}</Pill>
            <GradientText style={styles.exerciseName}>{currentEx.name}</GradientText>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <SystemText style={styles.statValue}>{currentEx.sets}</SystemText>
                <SystemText dim style={styles.statLabel}>SERIES</SystemText>
              </View>
              {currentEx.reps && (
                <View style={styles.statBox}>
                  <SystemText style={[styles.statValue, { color: colors.glow }]}>{currentEx.reps}</SystemText>
                  <SystemText dim style={styles.statLabel}>REPS</SystemText>
                </View>
              )}
              {currentEx.seconds && (
                <View style={styles.statBox}>
                  <SystemText style={[styles.statValue, { color: colors.warning }]}>{currentEx.seconds}s</SystemText>
                  <SystemText dim style={styles.statLabel}>DURACIÓN</SystemText>
                </View>
              )}
              <View style={styles.statBox}>
                <SystemText style={[styles.statValue, { color: colors.accent }]}>{currentEx.rest_seconds}s</SystemText>
                <SystemText dim style={styles.statLabel}>DESCANSO</SystemText>
              </View>
            </View>
          </SystemWindowPanel>

          {/* Guía de series — solo informativo, marcas como hecho */}
          <Animated.View entering={FadeInRight.delay(0).springify()}>
            <SystemPanel style={styles.setsPanel}>
              <SystemText style={styles.setsPanelTitle}>Tu objetivo</SystemText>
              {Array.from({ length: currentEx.sets }, (_, i) => (
                <Animated.View
                  key={i}
                  entering={FadeInDown.delay(i * 40).springify()}
                  style={styles.guideRow}
                >
                  <LinearGradient
                    colors={gradients.brand as any}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.setBadge}
                  >
                    <SystemText style={styles.setBadgeText}>{i + 1}</SystemText>
                  </LinearGradient>
                  <SystemText style={styles.guideText}>
                    Serie {i + 1}
                  </SystemText>
                  <SystemText style={styles.guideTarget}>
                    {currentEx.reps ? `${currentEx.reps} reps` : `${currentEx.seconds}s`}
                  </SystemText>
                </Animated.View>
              ))}
            </SystemPanel>
          </Animated.View>

          {/* Timer de descanso */}
          <Pressable onPress={toggleTimer}>
            <LinearGradient
              colors={timerRunning
                ? ([colors.bgElevated, colors.bgElevated] as any)
                : (gradients.mana as any)
              }
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.timerButton}
            >
              <SystemText style={[
                styles.timerText,
                { color: timerRunning ? colors.glow : colors.white },
              ]}>
                {timerLabel}
              </SystemText>
            </LinearGradient>
          </Pressable>

          {/* Botón completar */}
          <SystemButton
            title="Completar ejercicio ✓"
            variant="gradient"
            onPress={markCompleteAndNext}
          />

          {/* Próximos ejercicios */}
          {currentIdx < exercises.length - 1 && (
            <SystemPanel style={styles.nextPanel}>
              <SystemText dim style={styles.nextLabel}>SIGUIENTE</SystemText>
              <SystemText style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                {exercises[currentIdx + 1].name}
              </SystemText>
            </SystemPanel>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.md, paddingBottom: 80 },

  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
  },
  topBarRow: { flexDirection: 'row', justifyContent: 'space-between' },
  topBarText: { fontSize: 12, letterSpacing: 0.5 },

  exerciseCard: { gap: spacing.sm },
  exerciseName: { fontSize: 30, lineHeight: 34, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  statBox: {
    flex: 1, backgroundColor: colors.bgElevated,
    borderRadius: radius.md, padding: spacing.md,
    alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 24, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' },

  setsPanel: { gap: spacing.sm },
  setsPanelTitle: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint, marginBottom: 4 },
  guideRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: 6,
  },
  guideText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  guideTarget: { fontSize: 15, fontWeight: '800', color: colors.glow },
  setBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  setBadgeText: { fontSize: 13, fontWeight: '900', color: colors.white },

  timerButton: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  timerText: { fontSize: 22, fontWeight: '800', letterSpacing: 1 },

  nextPanel: { paddingVertical: spacing.md, gap: 4 },
  nextLabel: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },

  completeHeader: { gap: spacing.sm },
  completeTitle: { fontSize: 48, lineHeight: 52, fontWeight: '900' },
  xpBadgeWrap: { borderRadius: radius.lg, padding: 2, alignSelf: 'center', marginVertical: spacing.lg },
  xpBadgeInner: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg - 2,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  xpBadgeLabel: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: colors.textFaint },
  xpBadgeValue: { fontSize: 52, fontWeight: '900' },
  summaryPanel: {},
});
