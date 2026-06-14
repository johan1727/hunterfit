import { View, ScrollView, StyleSheet, SafeAreaView, Text } from 'react-native';
import { useHunterData } from '../../hooks/useHunterData';
import { useDemoStore } from '../../lib/demoStore';
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground,
  GradientText,
  Pill,
  RankBadge,
  StatRow,
  ProgressBar,
  SystemPanel,
  SystemText,
  SystemWindowPanel,
} from '../../components/system';
import { nextRankInfo } from '../../constants/game';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const { profile, character, quests } = useHunterData();
  const isDemo = useDemoStore((s) => s.isDemo);
  const exitDemo = useDemoStore((s) => s.exitDemo);

  if (!profile) return null;

  const rankInfo = nextRankInfo(profile.xp);
  const activeQuests = quests.filter((q) => !q.completed);

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* Banner demo */}
        {isDemo && (
          <LinearGradient
            colors={['rgba(91,124,255,0.18)', 'rgba(192,132,252,0.12)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.demoBanner}
          >
            <SystemText style={{ fontSize: 13, color: colors.glow }}>
              Modo exploración · datos de ejemplo
            </SystemText>
            <Text style={styles.demoExit} onPress={exitDemo}>Salir →</Text>
          </LinearGradient>
        )}

        {/* Hero — tarjeta del cazador */}
        <SystemWindowPanel style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1, gap: 6 }}>
              <Pill dotColor={colors.success}>Cazador activo</Pill>
              <GradientText style={styles.hunterName}>{profile.username || 'Cazador'}</GradientText>
              <SystemText dim style={{ fontSize: 14 }}>
                Rango {rankInfo.current}  ·  Nivel {profile.level}
              </SystemText>
            </View>
            <RankBadge rank={rankInfo.current} size={64} />
          </View>

          {/* XP bar */}
          <View style={{ marginTop: spacing.md, gap: 8 }}>
            <View style={styles.xpRow}>
              <SystemText dim style={{ fontSize: 12 }}>{profile.xp} XP</SystemText>
              <SystemText dim style={{ fontSize: 12 }}>
                {rankInfo.remaining} para {rankInfo.next ?? 'Máximo'}
              </SystemText>
            </View>
            <ProgressBar progress={rankInfo.progress} height={6} />
          </View>
        </SystemWindowPanel>

        {/* Stats rápidos */}
        <View style={styles.statsRow}>
          <StatChip label="Racha" value={`${profile.streak_days}d`} accent={colors.warning} />
          <StatChip label="Calorías" value={`${profile.calorie_target ?? '—'}`} accent={colors.glow} />
          <StatChip label="Peso" value={`${profile.weight_kg ?? '—'}kg`} accent={colors.accent} />
        </View>

        {/* Personaje */}
        {character && (
          <SystemPanel style={styles.charCard}>
            <View style={styles.charRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <SystemText style={{ fontSize: 11, color: colors.textFaint, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Compañero activo
                </SystemText>
                <SystemText style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>
                  {character.name}
                </SystemText>
                <SystemText dim style={{ fontSize: 13 }}>{character.title}</SystemText>
              </View>
              {/* Atributos compactos */}
              <View style={styles.attrGrid}>
                {Object.entries(character.attributes).map(([k, v]) => (
                  <View key={k} style={styles.attrItem}>
                    <SystemText style={{ fontSize: 10, color: colors.textFaint, textTransform: 'uppercase' }}>{k}</SystemText>
                    <SystemText style={{ fontSize: 16, fontWeight: '800', color: colors.glow }}>{v}</SystemText>
                  </View>
                ))}
              </View>
            </View>
            <SystemText dim style={{ fontSize: 13, marginTop: spacing.sm, lineHeight: 20 }}>
              {character.description_es}
            </SystemText>
          </SystemPanel>
        )}

        {/* Misiones del día */}
        <View style={styles.section}>
          <SystemText style={styles.sectionTitle}>Misiones de hoy</SystemText>
          {activeQuests.length > 0 ? (
            activeQuests.map((quest) => (
              <View key={quest.id} style={styles.questRow}>
                <View style={styles.questDot} />
                <SystemText style={{ flex: 1, fontSize: 15 }}>{quest.description_es}</SystemText>
                <LinearGradient
                  colors={gradients.mana}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.xpBadge}
                >
                  <Text style={styles.xpBadgeText}>+{quest.xp_reward} XP</Text>
                </LinearGradient>
              </View>
            ))
          ) : (
            <SystemText style={{ color: colors.success }}>Todas completadas 🎉</SystemText>
          )}
        </View>

        {/* Stats detalle */}
        <SystemPanel>
          <SystemText style={styles.sectionTitle}>Stats</SystemText>
          <StatRow label="XP total" value={profile.xp} />
          <StatRow label="Edad" value={`${profile.age ?? '—'} años`} />
          <StatRow label="Proteína objetivo" value={`${profile.protein_g ?? '—'} g`} />
        </SystemPanel>

      </ScrollView>
    </SafeAreaView>
  );
}

function StatChip({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={[styles.statChip, { borderColor: accent + '40' }]}>
      <SystemText style={{ fontSize: 20, fontWeight: '900', color: accent }}>{value}</SystemText>
      <SystemText dim style={{ fontSize: 11, marginTop: 2 }}>{label}</SystemText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.md, paddingBottom: 100 },

  demoBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  demoExit: { color: colors.danger, fontSize: 13, fontWeight: '600' },

  heroCard: { marginBottom: 0 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hunterName: { fontSize: 34, lineHeight: 36 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statChip: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    backgroundColor: colors.bgElevated, borderRadius: radius.md,
    borderWidth: 1,
  },

  charCard: {},
  charRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  attrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: 90 },
  attrItem: { alignItems: 'center', width: 38 },

  section: {
    backgroundColor: colors.panel, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.panelBorder,
    padding: spacing.lg, gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase',
    color: colors.textFaint, marginBottom: spacing.sm,
  },
  questRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.panelBorder,
  },
  questDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.glow,
  },
  xpBadge: {
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  xpBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
