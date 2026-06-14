import { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useHunterData } from '../../hooks/useHunterData';
import { useDemoStore } from '../../lib/demoStore';
import { regeneratePlan } from '../../services/routines';
import { supabase } from '../../lib/supabase';
import { colors, gradients, radius, spacing } from '../../theme/system';
import { AuroraBackground, GradientText, Pill, SystemPanel, SystemText, SystemButton } from '../../components/system';

export default function WorkoutsScreen() {
  const router = useRouter();
  const { profile, routines, isDemo, userId } = useHunterData();
  const [generating, setGenerating] = useState(false);
  const exitDemo = useDemoStore((s) => s.exitDemo);

  const categoryColor: Record<string, string> = {
    strength: colors.glow,
    cardio: colors.danger,
    flexibility: colors.accent,
  };

  async function handleGeneratePlan() {
    if (isDemo || !profile || !userId) return;
    setGenerating(true);
    try {
      const { data: chars } = await supabase.from('characters').select('*');
      const character = (chars ?? []).find((c: { id: number }) => c.id === profile.active_character_id);
      if (!character) return;
      const { data: exercises } = await supabase.from('exercises').select('*');
      await regeneratePlan(userId, character, profile.fitness_level, profile.training_days_per_week, exercises ?? [], profile.body_analysis?.grupos_a_priorizar ?? []);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Pill dotColor={colors.primary}>Plan semanal</Pill>
          <GradientText style={styles.title}>
            {routines.length > 0 ? `${routines.length} días` : 'Sin plan'}
          </GradientText>
          <SystemText dim style={{ fontSize: 14 }}>
            {routines.length > 0
              ? `${routines.reduce((s, r) => s + r.routine_exercises.length, 0)} ejercicios totales`
              : 'Genera tu primer plan personalizado'}
          </SystemText>
        </View>

        {/* Rutinas */}
        {routines.length > 0 ? (
          routines.map((routine, i) => (
            <Pressable
              key={routine.id}
              onPress={() => isDemo ? null : router.push(`/workout/${routine.id}`)}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <View style={styles.routineCard}>
                {/* Número de día */}
                <LinearGradient
                  colors={gradients.brand}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.dayBadge}
                >
                  <Text style={styles.dayNum}>{i + 1}</Text>
                </LinearGradient>

                <View style={styles.routineInfo}>
                  <SystemText style={{ fontSize: 11, color: colors.textFaint, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
                    Día {i + 1}
                  </SystemText>
                  <Text style={styles.routineName}>{routine.name}</Text>
                  <SystemText dim style={{ fontSize: 13, marginTop: 2 }}>{routine.focus}</SystemText>

                  {/* Preview ejercicios */}
                  <View style={styles.exPreview}>
                    {routine.routine_exercises.slice(0, 3).map((ex) => (
                      <View key={ex.id} style={styles.exTag}>
                        <View style={[styles.exDot, { backgroundColor: categoryColor[ex.exercise?.category ?? 'strength'] ?? colors.glow }]} />
                        <Text style={styles.exName}>{ex.exercise?.name_es}</Text>
                      </View>
                    ))}
                    {routine.routine_exercises.length > 3 && (
                      <Text style={styles.exMore}>+{routine.routine_exercises.length - 3} más</Text>
                    )}
                  </View>
                </View>

                <View style={styles.routineRight}>
                  <Text style={styles.exCount}>{routine.routine_exercises.length}</Text>
                  <SystemText dim style={{ fontSize: 10 }}>ejerc.</SystemText>
                  {!isDemo && <Text style={styles.arrow}>›</Text>}
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <SystemPanel style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
            <SystemText dim style={{ textAlign: 'center', lineHeight: 22 }}>
              Tu plan se genera según tu personaje,{'\n'}nivel y días disponibles.
            </SystemText>
            {isDemo ? (
              <Text style={{ color: colors.glow, fontSize: 13 }} onPress={exitDemo}>
                Crear cuenta para generar tu plan →
              </Text>
            ) : (
              <SystemButton title="Generar plan" loading={generating} onPress={handleGeneratePlan} variant="gradient" />
            )}
          </SystemPanel>
        )}

        {/* CTA regenerar */}
        {routines.length > 0 && !isDemo && (
          <SystemButton
            title="Regenerar plan"
            variant="ghost"
            loading={generating}
            onPress={handleGeneratePlan}
            style={{ marginTop: spacing.sm }}
          />
        )}

        {isDemo && routines.length > 0 && (
          <View style={styles.demoCta}>
            <SystemText dim style={{ fontSize: 13, textAlign: 'center' }}>
              Modo exploración · crea una cuenta para guardar tu progreso
            </SystemText>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.sm, paddingBottom: 100 },
  header: { gap: 6, marginBottom: spacing.sm },
  title: { fontSize: 38, lineHeight: 40 },

  routineCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.panel, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.panelBorder,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  dayBadge: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  dayNum: { color: '#fff', fontWeight: '900', fontSize: 16 },
  routineInfo: { flex: 1 },
  routineName: { color: colors.text, fontWeight: '800', fontSize: 18 },
  routineRight: { alignItems: 'center', gap: 2, paddingTop: 2 },
  exCount: { color: colors.glow, fontWeight: '900', fontSize: 22 },
  arrow: { color: colors.textFaint, fontSize: 22, marginTop: 4 },

  exPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  exTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.bgElevated, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  exDot: { width: 5, height: 5, borderRadius: 3 },
  exName: { color: colors.textDim, fontSize: 11 },
  exMore: { color: colors.textFaint, fontSize: 11, paddingVertical: 3 },

  demoCta: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.panelBorder, alignItems: 'center' },
});
