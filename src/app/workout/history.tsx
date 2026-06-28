import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground, GradientText, Pill, SystemPanel,
  SystemWindowPanel, SystemText, StatRow,
} from '../../components/system';
import { EmptyState } from '../../components/EmptyState';
import { EMPTY_STATES } from '../../lib/emptyState';
import { LinearGradient } from 'expo-linear-gradient';

type SetRecord = {
  id: number;
  exercise_id: number;
  set_number: number;
  reps_done: number | null;
  weight_kg: number | null;
  seconds_done: number | null;
  logged_at: string;
  session_id: string;
};

type SessionSummary = {
  session_id: string;
  date: string;
  routine_id: string;
  sets: SetRecord[];
  totalVolume: number;
};

type ExercisePR = {
  exercise_id: number;
  name_es: string;
  max_weight: number;
  max_reps: number;
  best_volume: number;
};

function useWorkoutHistory(userId: string | null) {
  return useQuery({
    queryKey: ['workout_sets', userId],
    enabled: !!userId,
    queryFn: async (): Promise<SessionSummary[]> => {
      const { data, error } = await supabase
        .from('workout_sets')
        .select('*')
        .eq('user_id', userId!)
        .order('logged_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = data as SetRecord[];

      // Group by session
      const map = new Map<string, SetRecord[]>();
      for (const r of rows) {
        if (!map.has(r.session_id)) map.set(r.session_id, []);
        map.get(r.session_id)!.push(r);
      }

      return Array.from(map.entries()).map(([sid, sets]) => ({
        session_id: sid,
        date: sets[0].logged_at,
        routine_id: (sets[0] as any).routine_id ?? '',
        sets,
        totalVolume: sets.reduce((a, s) => a + (s.weight_kg ?? 0) * (s.reps_done ?? 0), 0),
      }));
    },
  });
}

function usePersonalRecords(userId: string | null) {
  return useQuery({
    queryKey: ['workout_prs', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ExercisePR[]> => {
      const { data, error } = await supabase
        .from('workout_sets')
        .select('exercise_id, reps_done, weight_kg')
        .eq('user_id', userId!)
        .not('weight_kg', 'is', null);
      if (error) throw error;

      const { data: exData } = await supabase
        .from('exercises')
        .select('id, name_es');

      const exMap = new Map<number, string>(
        (exData ?? []).map((e: any) => [e.id, e.name_es])
      );

      const prMap = new Map<number, ExercisePR>();
      for (const r of (data as any[])) {
        if (!r.weight_kg) continue;
        const pr = prMap.get(r.exercise_id) ?? {
          exercise_id: r.exercise_id,
          name_es: exMap.get(r.exercise_id) ?? `Ejercicio ${r.exercise_id}`,
          max_weight: 0,
          max_reps: 0,
          best_volume: 0,
        };
        if (r.weight_kg > pr.max_weight) pr.max_weight = r.weight_kg;
        if ((r.reps_done ?? 0) > pr.max_reps) pr.max_reps = r.reps_done ?? 0;
        const vol = r.weight_kg * (r.reps_done ?? 0);
        if (vol > pr.best_volume) pr.best_volume = vol;
        prMap.set(r.exercise_id, pr);
      }

      return Array.from(prMap.values())
        .sort((a, b) => b.best_volume - a.best_volume)
        .slice(0, 20);
    },
  });
}

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const history = useWorkoutHistory(userId);
  const prs = usePersonalRecords(userId);
  const [tab, setTab] = useState<'history' | 'prs'>('history');

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pill dotColor={gradients.brand[1]}>Entrenamiento</Pill>
            <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
              <SystemText dim style={{ fontSize: 14 }}>← Atrás</SystemText>
            </Pressable>
          </View>
          <GradientText style={styles.title}>Historial</GradientText>
        </Animated.View>

        {/* Tabs */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.tabs}>
          {(['history', 'prs'] as const).map((t) => (
            <Pressable
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <SystemText style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'history' ? 'Sesiones' : 'Récords'}
              </SystemText>
            </Pressable>
          ))}
        </Animated.View>

        {tab === 'history' && (
          <>
            {history.data && history.data.length === 0 ? (
              <EmptyState
                {...EMPTY_STATES.workouts}
                cta={{ label: 'Comenzar entrenamiento', onPress: () => router.push('/(tabs)/workouts') }}
              />
            ) : (
              history.data?.map((session, idx) => (
                <Animated.View key={session.session_id} entering={FadeInDown.delay(idx * 50).springify()}>
                  <SystemWindowPanel style={styles.sessionCard}>
                    <View style={styles.sessionHeader}>
                      <SystemText style={styles.sessionDate}>
                        {new Date(session.date).toLocaleDateString('es-MX', {
                          weekday: 'short', day: 'numeric', month: 'short',
                        })}
                      </SystemText>
                      {session.totalVolume > 0 && (
                        <Pill dotColor={gradients.brand[0]}>
                          {session.totalVolume.toLocaleString('es-MX')} kg vol
                        </Pill>
                      )}
                    </View>

                    <View style={styles.sessionStats}>
                      <View style={styles.sessionStat}>
                        <SystemText style={styles.sessionStatVal}>{session.sets.length}</SystemText>
                        <SystemText dim style={styles.sessionStatLbl}>SERIES</SystemText>
                      </View>
                      <View style={styles.sessionStat}>
                        <SystemText style={styles.sessionStatVal}>
                          {new Set(session.sets.map((s) => s.exercise_id)).size}
                        </SystemText>
                        <SystemText dim style={styles.sessionStatLbl}>EJERCICIOS</SystemText>
                      </View>
                      {session.totalVolume > 0 && (
                        <View style={styles.sessionStat}>
                          <SystemText style={[styles.sessionStatVal, { color: colors.glow }]}>
                            {Math.round(session.totalVolume).toLocaleString('es-MX')}
                          </SystemText>
                          <SystemText dim style={styles.sessionStatLbl}>VOL. KG</SystemText>
                        </View>
                      )}
                    </View>
                  </SystemWindowPanel>
                </Animated.View>
              ))
            )}
          </>
        )}

        {tab === 'prs' && (
          <>
            {!prs.data?.length ? (
              <SystemPanel style={styles.empty}>
                <SystemText dim style={{ textAlign: 'center' }}>
                  Registra peso en tus ejercicios para ver tus récords personales.
                </SystemText>
              </SystemPanel>
            ) : (
              prs.data.map((pr, idx) => (
                <Animated.View key={pr.exercise_id} entering={FadeInDown.delay(idx * 40).springify()}>
                  <SystemPanel style={styles.prCard}>
                    <View style={styles.prHeader}>
                      <LinearGradient
                        colors={gradients.brand as any}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.prRankBadge}
                      >
                        <SystemText style={styles.prRankText}>{idx + 1}</SystemText>
                      </LinearGradient>
                      <SystemText style={styles.prName} numberOfLines={1}>{pr.name_es}</SystemText>
                    </View>
                    <View style={styles.prStats}>
                      <View style={styles.prStat}>
                        <SystemText style={[styles.prStatVal, { color: colors.glow }]}>
                          {pr.max_weight} kg
                        </SystemText>
                        <SystemText dim style={styles.prStatLbl}>MÁXIMO PESO</SystemText>
                      </View>
                      <View style={styles.prStat}>
                        <SystemText style={[styles.prStatVal, { color: colors.accent }]}>
                          {pr.max_reps}
                        </SystemText>
                        <SystemText dim style={styles.prStatLbl}>MÁXIMO REPS</SystemText>
                      </View>
                      <View style={styles.prStat}>
                        <SystemText style={styles.prStatVal}>
                          {Math.round(pr.best_volume).toLocaleString('es-MX')}
                        </SystemText>
                        <SystemText dim style={styles.prStatLbl}>MEJOR VOL.</SystemText>
                      </View>
                    </View>
                  </SystemPanel>
                </Animated.View>
              ))
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md, paddingBottom: 80 },
  header: { gap: spacing.sm },
  title: { fontSize: 38, lineHeight: 42, fontWeight: '900' },

  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.lg,
    alignItems: 'center', backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.panelBorder,
  },
  tabActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: colors.glow },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textFaint },
  tabTextActive: { color: colors.text },

  empty: { alignItems: 'center', paddingVertical: spacing.xl },

  sessionCard: { gap: spacing.sm },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionDate: { fontSize: 15, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
  sessionStats: { flexDirection: 'row', gap: spacing.sm },
  sessionStat: {
    flex: 1, backgroundColor: colors.bgElevated,
    borderRadius: radius.md, padding: spacing.md,
    alignItems: 'center', gap: 2,
  },
  sessionStatVal: { fontSize: 20, fontWeight: '900', color: colors.text },
  sessionStatLbl: { fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase' },

  prCard: { gap: spacing.sm },
  prHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  prRankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  prRankText: { fontSize: 12, fontWeight: '900', color: colors.white },
  prName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  prStats: { flexDirection: 'row', gap: spacing.sm },
  prStat: {
    flex: 1, backgroundColor: colors.bgElevated,
    borderRadius: radius.md, padding: spacing.sm,
    alignItems: 'center', gap: 2,
  },
  prStatVal: { fontSize: 16, fontWeight: '900', color: colors.text },
  prStatLbl: { fontSize: 7, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.textFaint, textAlign: 'center' },
});
