import { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useHunterData } from '../../hooks/useHunterData';
import { useDemoStore } from '../../lib/demoStore';
import { useWeeklyQuests } from '../../hooks/useData';
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground,
  GradientText,
  Pill,
  RankBadge,
  ProgressBar,
  SystemPanel,
  SystemText,
  SystemWindowPanel,
} from '../../components/system';
import { CalorieRing } from '../../components/CalorieRing';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { FAB } from '../../components/FAB';
import { nextRankInfo } from '../../constants/game';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, character, quests, meals, routines, userId } = useHunterData();
  const isDemo = useDemoStore((s) => s.isDemo);
  const exitDemo = useDemoStore((s) => s.exitDemo);
  const weeklyQuestsQuery = useWeeklyQuests(isDemo ? null : userId, profile?.level);
  const [questTab, setQuestTab] = useState<'daily' | 'weekly'>('daily');

  if (!profile) {
    return (
      <SafeAreaView style={styles.root}>
        <AuroraBackground />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <GradientText style={{ fontSize: 28 }}>HunterFit</GradientText>
          <SystemText dim>Cargando tu perfil…</SystemText>
        </View>
      </SafeAreaView>
    );
  }

  const rankInfo = nextRankInfo(profile.xp);
  const activeQuests = quests.filter((q) => !q.completed && !q.type?.startsWith('weekly_'));
  const activeWeeklyQuests = (weeklyQuestsQuery.data ?? []).filter((q) => !q.completed);

  // Totales de hoy
  const todayKcal = Math.round(meals.reduce((s, m) => s + m.kcal, 0));
  const todayProtein = Math.round(meals.reduce((s, m) => s + m.protein_g, 0));
  const todayCarbs = Math.round(meals.reduce((s, m) => s + m.carbs_g, 0));
  const todayFat = Math.round(meals.reduce((s, m) => s + m.fat_g, 0));

  const nextRoutine = routines[0] ?? null;

  function pressHaptic(fn: () => void) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  }

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner demo */}
        {isDemo && (
          <Animated.View entering={FadeInDown.delay(0).springify()}>
            <LinearGradient
              colors={['rgba(91,124,255,0.18)', 'rgba(192,132,252,0.12)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.demoBanner}
            >
              <SystemText style={{ fontSize: 13, color: colors.glow }}>
                Modo exploración · tu progreso no se guarda
              </SystemText>
              <Text style={styles.demoExit} onPress={exitDemo}>Crear cuenta →</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* ── SECCIÓN 1: CALORÍAS (como Fitia) ── */}
        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <SystemWindowPanel style={styles.kcalCard}>
            {/* Fecha + saludo */}
            <View style={styles.kcalHeader}>
              <View>
                <SystemText dim style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })}
                </SystemText>
                <SystemText style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2 }}>
                  Hola, {profile.username || 'Cazador'} 👋
                </SystemText>
              </View>
              <RankBadge rank={rankInfo.current} size={44} />
            </View>

            {/* Anillo + macros */}
            <View style={styles.kcalBody}>
              <CalorieRing consumed={todayKcal} target={profile.calorie_target ?? 2000} size={148} />

              <View style={styles.macroCol}>
                <MacroBar label="Proteína" current={todayProtein} target={profile.protein_g ?? 150} color={colors.danger} unit="g" />
                <MacroBar label="Carbos" current={todayCarbs} target={profile.carbs_g ?? 250} color={colors.warning} unit="g" />
                <MacroBar label="Grasas" current={todayFat} target={profile.fat_g ?? 65} color={colors.accent} unit="g" />
              </View>
            </View>
          </SystemWindowPanel>
        </Animated.View>

        {/* ── SECCIÓN 2: ACCIONES RÁPIDAS ── */}
        <Animated.View entering={FadeInDown.delay(130).springify()} style={styles.quickRow}>
          <QuickAction
            icon="restaurant"
            label={"Registrar\ncomida"}
            onPress={() => pressHaptic(() => router.push('/nutrition/search'))}
            gradient
          />
          <QuickAction
            icon="barbell"
            label={nextRoutine ? `Entrenar\n${nextRoutine.name}` : 'Ver\nrutinas'}
            onPress={() => pressHaptic(() =>
              nextRoutine
                ? router.push(`/workout/${nextRoutine.id}`)
                : router.push('/(tabs)/workouts')
            )}
          />
          <QuickAction
            icon="stats-chart"
            label={"Mi\nprogreso"}
            onPress={() => pressHaptic(() => router.push('/(tabs)/profile'))}
          />
        </Animated.View>

        {/* ── SECCIÓN 3: COMIDAS DE HOY ── */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <SystemText style={styles.sectionTitle}>Hoy comiste</SystemText>
              <Pressable onPress={() => router.push('/(tabs)/nutrition')}>
                <SystemText style={{ fontSize: 12, color: colors.glow }}>Ver todo →</SystemText>
              </Pressable>
            </View>

            {meals.length === 0 ? (
              <Pressable
                style={styles.emptyMeals}
                onPress={() => pressHaptic(() => router.push('/nutrition/search'))}
              >
                <SystemText dim style={{ fontSize: 14, textAlign: 'center' }}>
                  Aún no registraste nada hoy
                </SystemText>
                <SystemText style={{ fontSize: 13, color: colors.glow, marginTop: 4 }}>
                  + Agregar primera comida
                </SystemText>
              </Pressable>
            ) : (
              meals.slice(0, 3).map((meal) => (
                <View key={meal.id} style={styles.mealRow}>
                  <View style={styles.mealDot} />
                  <SystemText style={{ flex: 1, fontSize: 14 }}>{meal.custom_name ?? 'Comida'}</SystemText>
                  <SystemText dim style={{ fontSize: 12 }}>{Math.round(meal.kcal)} kcal</SystemText>
                </View>
              ))
            )}
            {meals.length > 3 && (
              <SystemText dim style={{ fontSize: 12, textAlign: 'center', marginTop: 6 }}>
                +{meals.length - 3} más
              </SystemText>
            )}
          </View>
        </Animated.View>

        {/* ── SECCIÓN 4: RANK / XP (secundario) ── */}
        <Animated.View entering={FadeInDown.delay(270).springify()}>
          <SystemPanel style={styles.rankPanel}>
            <View style={styles.rankRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <SystemText dim style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  Rango del sistema
                </SystemText>
                <GradientText style={{ fontSize: 22, lineHeight: 24 }}>
                  {rankInfo.current} · Nivel {profile.level}
                </GradientText>
                <SystemText dim style={{ fontSize: 12 }}>
                  {rankInfo.remaining} XP para {rankInfo.next ?? 'Rango S'}
                </SystemText>
              </View>
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={22} color={colors.warning} />
                <SystemText style={{ fontSize: 18, fontWeight: '900', color: colors.warning }}>
                  {profile.streak_days}
                </SystemText>
                <SystemText dim style={{ fontSize: 10 }}>días</SystemText>
              </View>
            </View>
            <View style={{ marginTop: spacing.sm }}>
              <ProgressBar progress={rankInfo.progress} height={5} />
            </View>
          </SystemPanel>
        </Animated.View>

        {/* ── SECCIÓN 5: MISIONES (Hoy / Semana) ── */}
        {(activeQuests.length > 0 || activeWeeklyQuests.length > 0) && (
          <Animated.View entering={FadeInDown.delay(340).springify()}>
            <View style={styles.section}>
              <SegmentedTabs
                value={questTab}
                onChange={setQuestTab}
                options={[
                  { key: 'daily', label: `Hoy (${activeQuests.length})`, icon: 'flash-outline' },
                  { key: 'weekly', label: `Semana (${activeWeeklyQuests.length})`, icon: 'calendar-outline' },
                ]}
              />
              <Animated.View key={questTab} entering={FadeIn.duration(180)} style={{ marginTop: spacing.sm }}>
                {questTab === 'daily'
                  ? activeQuests.map((quest) => (
                      <View key={quest.id} style={styles.questRow}>
                        <View style={styles.questDot} />
                        <SystemText style={{ flex: 1, fontSize: 14 }}>{quest.description_es}</SystemText>
                        <LinearGradient
                          colors={gradients.mana}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={styles.xpBadge}
                        >
                          <Text style={styles.xpBadgeText}>+{quest.xp_reward} XP</Text>
                        </LinearGradient>
                      </View>
                    ))
                  : activeWeeklyQuests.map((quest) => (
                      <View key={quest.id} style={styles.questRow}>
                        <LinearGradient
                          colors={gradients.brand as any}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={styles.weeklyDot}
                        />
                        <View style={{ flex: 1, gap: 4 }}>
                          <SystemText style={{ fontSize: 14 }}>{quest.description_es}</SystemText>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={[styles.weeklyBar, { width: 100 }]}>
                              <View style={[styles.weeklyBarFill, {
                                width: `${Math.min(100, ((quest.progress ?? 0) / quest.target) * 100)}%` as any,
                              }]} />
                            </View>
                            <SystemText dim style={{ fontSize: 11 }}>
                              {quest.progress ?? 0}/{quest.target}
                            </SystemText>
                          </View>
                        </View>
                        <LinearGradient
                          colors={gradients.brand as any}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={styles.xpBadge}
                        >
                          <Text style={styles.xpBadgeText}>+{quest.xp_reward} XP</Text>
                        </LinearGradient>
                      </View>
                    ))}
                {(questTab === 'daily' ? activeQuests : activeWeeklyQuests).length === 0 && (
                  <SystemText dim style={{ fontSize: 13, textAlign: 'center', paddingVertical: spacing.md }}>
                    {questTab === 'daily' ? 'Sin misiones de hoy' : 'Sin misiones semanales'}
                  </SystemText>
                )}
              </Animated.View>
            </View>
          </Animated.View>
        )}

      </ScrollView>

      {/* FAB flotante */}
      <FAB onPress={() => pressHaptic(() => router.push('/nutrition/search'))} />
    </SafeAreaView>
  );
}

/* ── Sub-componentes ── */

function MacroBar({ label, current, target, color, unit }: {
  label: string; current: number; target: number; color: string; unit: string;
}) {
  const pct = Math.min(current / Math.max(target, 1), 1);
  return (
    <View style={mbStyles.wrap}>
      <View style={mbStyles.row}>
        <SystemText dim style={{ fontSize: 11 }}>{label}</SystemText>
        <SystemText style={{ fontSize: 11, color, fontWeight: '700' }}>
          {current}/{target}{unit}
        </SystemText>
      </View>
      <View style={mbStyles.track}>
        <View style={[mbStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const mbStyles = StyleSheet.create({
  wrap: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});

function QuickAction({ icon, label, onPress, gradient }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; gradient?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [qaStyles.wrap, pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] }]}
      onPress={onPress}
    >
      {gradient ? (
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={qaStyles.btn}
        >
          <Ionicons name={icon} size={22} color="#fff" />
          <Text style={[qaStyles.label, { color: '#fff' }]}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={[qaStyles.btn, qaStyles.btnGhost]}>
          <Ionicons name={icon} size={22} color={colors.glow} />
          <Text style={qaStyles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const qaStyles = StyleSheet.create({
  wrap: { flex: 1 },
  btn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
    borderRadius: radius.lg, gap: 6,
  },
  btnGhost: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.panelBorder,
  },
  label: { fontSize: 11, fontWeight: '600', color: colors.textDim, textAlign: 'center', lineHeight: 15 },
});

/* ── Estilos principales ── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.md, paddingBottom: 120 },

  demoBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  demoExit: { color: colors.danger, fontSize: 13, fontWeight: '600' },

  kcalCard: {},
  kcalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.lg },
  kcalBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  macroCol: { flex: 1, gap: spacing.md },

  quickRow: { flexDirection: 'row', gap: spacing.sm },

  section: {
    backgroundColor: colors.panel, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.panelBorder,
    padding: spacing.lg, gap: spacing.sm,
  },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint },

  emptyMeals: { alignItems: 'center', paddingVertical: spacing.md },

  mealRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.panelBorder,
  },
  mealDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.glow },

  rankPanel: {},
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  streakBadge: { alignItems: 'center', gap: 2 },

  questRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.panelBorder,
  },
  questDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.glow },
  weeklyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 3 },
  weeklyBar: { height: 4, backgroundColor: colors.bgElevated, borderRadius: 2, overflow: 'hidden' },
  weeklyBarFill: { height: '100%', backgroundColor: colors.glow, borderRadius: 2 },
  xpBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  xpBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
