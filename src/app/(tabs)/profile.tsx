import { View, ScrollView, StyleSheet, SafeAreaView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useHunterData } from '../../hooks/useHunterData';
import { useDemoStore } from '../../lib/demoStore';
import { colors, gradients, radius, rankColors, spacing } from '../../theme/system';
import {
  AuroraBackground, GradientText, Pill, ProgressBar,
  RankBadge, SystemButton, SystemPanel, SystemText, SystemWindowPanel,
} from '../../components/system';
import { nextRankInfo } from '../../constants/game';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, character, isDemo } = useHunterData();
  const exitDemo = useDemoStore((s) => s.exitDemo);

  if (!profile) return null;

  const rankInfo = nextRankInfo(profile.xp);

  const stats = {
    str: Math.min(10, Math.floor(profile.level / 5) + 1 + (profile.goal === 'masa' ? 2 : 0)),
    agi: Math.min(10, Math.floor(profile.level / 5) + 1 + (profile.goal === 'agilidad' ? 2 : 0)),
    vit: Math.min(10, Math.floor(profile.level / 5) + 2),
    sta: Math.min(10, Math.floor(profile.level / 5) + 1 + (profile.training_days_per_week > 3 ? 1 : 0)),
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  }

  const goalLabel: Record<string, string> = {
    definicion: 'Definición', masa: 'Ganar masa', agilidad: 'Agilidad',
    movilidad: 'Movilidad', fuerza: 'Fuerza', general: 'General',
  };

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Status Window — el panel hero */}
        <SystemWindowPanel>
          {/* Cabecera */}
          <View style={styles.heroRow}>
            <View style={{ flex: 1, gap: 6 }}>
              <Pill dotColor={rankColors[rankInfo.current]}>{rankInfo.current} · Nivel {profile.level}</Pill>
              <GradientText style={styles.username}>{profile.username || 'Cazador'}</GradientText>
              <SystemText dim style={{ fontSize: 13 }}>
                {profile.xp} XP · racha {profile.streak_days} días 🔥
              </SystemText>
            </View>
            <RankBadge rank={rankInfo.current} size={64} />
          </View>

          {/* Barra de rango */}
          <View style={{ marginTop: spacing.md, gap: 8 }}>
            <View style={styles.rankRow}>
              <SystemText dim style={{ fontSize: 11 }}>Rango {rankInfo.current}</SystemText>
              <SystemText dim style={{ fontSize: 11 }}>
                {rankInfo.next ? `${rankInfo.remaining} XP → ${rankInfo.next}` : 'Rango máximo'}
              </SystemText>
            </View>
            <ProgressBar progress={rankInfo.progress} color={rankColors[rankInfo.current]} height={6} />
          </View>
        </SystemWindowPanel>

        {/* Stats RPG */}
        <SystemPanel>
          <SystemText style={styles.sectionLabel}>Estadísticas</SystemText>
          <View style={styles.statsGrid}>
            {Object.entries(stats).map(([key, val]) => (
              <StatBar key={key} label={key.toUpperCase()} value={val} max={10} />
            ))}
          </View>
        </SystemPanel>

        {/* Personaje */}
        {character && (
          <SystemPanel style={styles.charCard}>
            <SystemText style={styles.sectionLabel}>Compañero activo</SystemText>
            <View style={styles.charRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.charName}>{character.name}</Text>
                <SystemText dim style={{ fontSize: 13 }}>{character.title}</SystemText>
              </View>
              <View style={styles.attrGrid}>
                {Object.entries(character.attributes).map(([k, v]) => (
                  <View key={k} style={styles.attrItem}>
                    <SystemText style={{ fontSize: 9, color: colors.textFaint, textTransform: 'uppercase' }}>{k}</SystemText>
                    <SystemText style={{ fontSize: 15, fontWeight: '900', color: colors.glow }}>{v}</SystemText>
                  </View>
                ))}
              </View>
            </View>
          </SystemPanel>
        )}

        {/* Info */}
        <SystemPanel>
          <SystemText style={styles.sectionLabel}>Información</SystemText>
          <InfoRow label="Objetivo" value={goalLabel[profile.goal ?? ''] ?? profile.goal ?? '—'} />
          <InfoRow label="Nivel de forma" value={profile.fitness_level} />
          <InfoRow label="Días de entrenamiento" value={`${profile.training_days_per_week} días / semana`} />
          <InfoRow label="Edad" value={`${profile.age ?? '—'} años`} />
          <InfoRow label="Peso" value={`${profile.weight_kg ?? '—'} kg`} />
          <InfoRow label="Meta calórica" value={`${profile.calorie_target ?? '—'} kcal`} />
        </SystemPanel>

        {/* Acciones */}
        {isDemo ? (
          <LinearGradient
            colors={['rgba(91,124,255,0.15)', 'rgba(192,132,252,0.10)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.demoBanner}
          >
            <SystemText style={{ fontSize: 14, color: colors.text, marginBottom: spacing.sm }}>
              Modo exploración
            </SystemText>
            <SystemText dim style={{ fontSize: 13, marginBottom: spacing.md }}>
              Crea una cuenta para guardar tu progreso, desbloquear personajes y competir en rangos.
            </SystemText>
            <SystemButton title="Crear cuenta" variant="gradient" onPress={exitDemo} />
          </LinearGradient>
        ) : (
          <SystemButton title="Cerrar sesión" variant="danger" onPress={handleLogout} />
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <View style={statBarStyles.row}>
      <Text style={statBarStyles.label}>{label}</Text>
      <View style={statBarStyles.track}>
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[statBarStyles.fill, { width: `${(value / max) * 100}%` }]}
        />
      </View>
      <Text style={statBarStyles.value}>{value}</Text>
    </View>
  );
}

const statBarStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 10 },
  label: { color: colors.textFaint, fontSize: 11, fontWeight: '700', width: 32, letterSpacing: 1 },
  track: { flex: 1, height: 6, backgroundColor: colors.bgElevated, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  value: { color: colors.glow, fontSize: 13, fontWeight: '800', width: 20, textAlign: 'right' },
});

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <SystemText dim style={{ fontSize: 13 }}>{label}</SystemText>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.panelBorder },
  value: { color: colors.text, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.md, paddingBottom: 100 },

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  username: { fontSize: 32, lineHeight: 34 },
  rankRow: { flexDirection: 'row', justifyContent: 'space-between' },

  sectionLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint, marginBottom: spacing.md },
  statsGrid: { gap: 0 },

  charCard: {},
  charRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  charName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  attrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: 96 },
  attrItem: { alignItems: 'center', width: 40 },

  demoBanner: { borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.panelBorder },
});
