import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text, TextInput, Alert, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useHunterData } from '../../hooks/useHunterData';
import { useDemoStore } from '../../lib/demoStore';
import { useWeightHistory, useLogWeight, useWeeklyCalories, useUpdateProfile } from '../../hooks/useData';
import {
  requestNotificationPermission,
  scheduleMealReminders,
  cancelMealReminders,
  getRemindersEnabled,
} from '../../services/notifications';
import { colors, gradients, numeric, radius, rankColors, spacing } from '../../theme/system';
import {
  AuroraBackground, GradientText, Pill, ProgressBar,
  RankBadge, SystemButton, SystemPanel, SystemText,
} from '../../components/system';
import { nextRankInfo } from '../../constants/game';
import { MenuList } from '../../components/MenuList';
import { HudPanel } from '../../components/HudPanel';
import { StatRadar } from '../../components/StatRadar';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, character, isDemo, userId } = useHunterData();
  const exitDemo = useDemoStore((s) => s.exitDemo);
  const weightHistory = useWeightHistory(isDemo ? null : userId);
  const logWeight = useLogWeight(isDemo ? null : userId);
  const weeklyCalories = useWeeklyCalories(isDemo ? null : userId);
  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [remindersOn, setRemindersOn] = useState<boolean | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const updateProfile = useUpdateProfile(isDemo ? null : userId);

  useEffect(() => {
    getRemindersEnabled().then(setRemindersOn);
  }, []);

  async function toggleReminders() {
    if (remindersOn) {
      await cancelMealReminders();
      setRemindersOn(false);
    } else {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Permisos', 'Activa las notificaciones en los ajustes del sistema');
        return;
      }
      await scheduleMealReminders();
      setRemindersOn(true);
    }
  }

  async function handleSaveWeight() {
    const val = parseFloat(weightInput.replace(',', '.'));
    if (isNaN(val) || val < 20 || val > 300) {
      Alert.alert('Peso inválido', 'Ingresa un peso entre 20 y 300 kg');
      return;
    }
    setSavingWeight(true);
    try {
      await logWeight.mutateAsync(val);
      setWeightInput('');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el peso');
    } finally {
      setSavingWeight(false);
    }
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.root}>
        <AuroraBackground />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <GradientText style={{ fontSize: 22 }}>Perfil</GradientText>
          <SystemText dim style={{ marginTop: 8 }}>Cargando…</SystemText>
        </View>
      </SafeAreaView>
    );
  }

  const rankInfo = nextRankInfo(profile.xp);

  const stats = {
    str: Math.min(10, Math.floor(profile.level / 5) + 1 + (profile.goal === 'masa' ? 2 : 0)),
    agi: Math.min(10, Math.floor(profile.level / 5) + 1 + (profile.goal === 'agilidad' ? 2 : 0)),
    vit: Math.min(10, Math.floor(profile.level / 5) + 2),
    sta: Math.min(10, Math.floor(profile.level / 5) + 1 + (profile.training_days_per_week > 3 ? 1 : 0)),
  };

  async function handleSaveUsername() {
    const val = usernameInput.trim();
    if (!val || val.length < 2) return;
    setSavingUsername(true);
    try {
      await updateProfile.mutateAsync({ username: val } as any);
      setEditingUsername(false);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el nombre');
    } finally {
      setSavingUsername(false);
    }
  }

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
        <Animated.View entering={FadeInDown.delay(60).springify()}>
        <HudPanel>
          {/* Cabecera */}
          <View style={styles.heroRow}>
            <View style={{ flex: 1, gap: 6 }}>
              <Pill dotColor={rankColors[rankInfo.current]}>{rankInfo.current} · Nivel {profile.level}</Pill>
              <GradientText style={styles.username}>{profile.username || 'Cazador'}</GradientText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <SystemText dim style={[{ fontSize: 13 }, numeric]}>
                  {profile.xp} XP · racha {profile.streak_days} días
                </SystemText>
                <Ionicons name="flame" size={13} color={colors.warning} />
              </View>
            </View>
            <RankBadge rank={rankInfo.current} size={64} />
          </View>

          {/* Barra de rango */}
          <View style={{ marginTop: spacing.md, gap: 8 }}>
            <View style={styles.rankRow}>
              <SystemText dim style={{ fontSize: 11 }}>Rango {rankInfo.current}</SystemText>
              <SystemText dim style={[{ fontSize: 11 }, numeric]}>
                {rankInfo.next ? `${rankInfo.remaining} XP → ${rankInfo.next}` : 'Rango máximo'}
              </SystemText>
            </View>
            <ProgressBar progress={rankInfo.progress} color={rankColors[rankInfo.current]} height={6} />
          </View>
        </HudPanel>
        </Animated.View>

        {/* Stats RPG */}
        <Animated.View entering={FadeInDown.delay(140).springify()}>
        <SystemPanel style={{ alignItems: 'center' }}>
          <SystemText style={[styles.sectionLabel, { alignSelf: 'flex-start' }]}>Estadísticas</SystemText>
          <StatRadar
            size={220}
            stats={[
              { label: 'STR', value: stats.str },
              { label: 'AGI', value: stats.agi },
              { label: 'VIT', value: stats.vit },
              { label: 'STA', value: stats.sta },
            ]}
          />
        </SystemPanel>
        </Animated.View>

        {/* Personaje */}
        {character && (
          <Animated.View entering={FadeInDown.delay(220).springify()}>
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
          </Animated.View>
        )}

        {/* Info */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
        <SystemPanel>
          <SystemText style={styles.sectionLabel}>Información</SystemText>
          <InfoRow label="Objetivo" value={goalLabel[profile.goal ?? ''] ?? profile.goal ?? '—'} />
          <InfoRow label="Nivel de forma" value={profile.fitness_level} />
          <InfoRow label="Días de entrenamiento" value={`${profile.training_days_per_week} días / semana`} />
          <InfoRow label="Edad" value={`${profile.age ?? '—'} años`} />
          <InfoRow label="Peso" value={`${profile.weight_kg ?? '—'} kg`} />
          <InfoRow label="Meta calórica" value={`${profile.calorie_target ?? '—'} kcal`} />
        </SystemPanel>
        </Animated.View>

        {/* Gráfica semanal de calorías */}
        {!isDemo && (weeklyCalories.data?.some((d) => d.kcal > 0) ?? false) && (
          <Animated.View entering={FadeInDown.delay(350).springify()}>
            <WeeklyNutritionPanel data={weeklyCalories.data ?? []} profile={profile} />
          </Animated.View>
        )}

        {/* Historial de peso */}
        {!isDemo && (
          <Animated.View entering={FadeInDown.delay(360).springify()}>
            <SystemPanel style={{ gap: spacing.md }}>
              <SystemText style={styles.sectionLabel}>Progreso de peso</SystemText>
              {weightHistory.data && weightHistory.data.length > 1 && (
                <WeightSparkline data={weightHistory.data} />
              )}
              {weightHistory.data && weightHistory.data.length > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <SystemText dim style={{ fontSize: 12 }}>
                    Inicio: {weightHistory.data[0].weight_kg} kg
                  </SystemText>
                  <SystemText dim style={{ fontSize: 12 }}>
                    Actual: {weightHistory.data[weightHistory.data.length - 1].weight_kg} kg
                  </SystemText>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <TextInput
                  style={styles.weightInput}
                  placeholder="Ej: 72.5"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  value={weightInput}
                  onChangeText={setWeightInput}
                />
                <Pressable
                  onPress={handleSaveWeight}
                  disabled={savingWeight || !weightInput}
                  style={({ pressed }) => [styles.weightSaveBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.weightSaveBtnText}>{savingWeight ? '…' : 'Guardar'}</Text>
                </Pressable>
              </View>
            </SystemPanel>
          </Animated.View>
        )}

        {/* Acciones */}
        <Animated.View entering={FadeInDown.delay(380).springify()} style={{ gap: spacing.sm }}>
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
          <>
            {!profile?.is_premium && (
              <SystemButton
                title="Obtener Hunter Pro"
                variant="gradient"
                onPress={() => router.push('/premium/upgrade' as any)}
              />
            )}

            {/* Edición de nombre inline (cuando está activa) */}
            {editingUsername && (
              <View style={styles.usernameRow}>
                <TextInput
                  style={styles.usernameInput}
                  value={usernameInput}
                  onChangeText={setUsernameInput}
                  placeholder="Tu nombre de cazador"
                  placeholderTextColor={colors.textFaint}
                  maxLength={24}
                  autoFocus
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveUsername}
                />
                <Pressable
                  onPress={handleSaveUsername}
                  disabled={savingUsername || usernameInput.trim().length < 2}
                  style={[styles.usernameBtn, (savingUsername || usernameInput.trim().length < 2) && { opacity: 0.4 }]}
                >
                  {savingUsername
                    ? <Text style={styles.usernameBtnText}>…</Text>
                    : <Ionicons name="checkmark" size={18} color={colors.text} />}
                </Pressable>
                <Pressable onPress={() => setEditingUsername(false)} style={styles.usernameCancelBtn}>
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
              </View>
            )}

            <MenuList
              title="Cuenta"
              items={[
                ...(editingUsername ? [] : [{
                  icon: 'person-outline',
                  label: 'Nombre',
                  value: profile.username || 'Sin nombre',
                  onPress: () => { setUsernameInput(profile.username ?? ''); setEditingUsername(true); },
                }]),
                { icon: 'create-outline', label: 'Editar mis datos', onPress: () => router.push('/onboarding/quiz?from=profile') },
                { icon: 'people-outline', label: 'Cambiar personaje', onPress: () => router.push('/onboarding/character-select') },
                { icon: 'people-circle-outline', label: 'Plan Familiar', iconColor: colors.glow, onPress: () => router.push('/premium/family' as any) },
              ]}
            />

            <MenuList
              title="Progreso"
              items={[
                { icon: 'medal-outline', label: 'Mis logros', iconColor: colors.warning, onPress: () => router.push('/profile/badges' as any) },
                { icon: 'trophy-outline', label: 'Leaderboard global', iconColor: colors.warning, onPress: () => router.push('/social/leaderboard' as any) },
                { icon: 'heart-outline', label: 'Salud y pasos', iconColor: colors.danger, onPress: () => router.push('/profile/health' as any) },
                { icon: 'body', label: 'Seguimiento corporal', onPress: () => router.push('/profile/body-tracking') },
                { icon: 'camera-outline', label: 'Fotos de progreso', onPress: () => router.push('/profile/photos') },
              ]}
            />

            <MenuList
              title="Ajustes"
              items={[
                ...(remindersOn !== null ? [{
                  icon: remindersOn ? 'notifications' : 'notifications-off-outline',
                  label: remindersOn ? 'Recordatorios activados' : 'Recordatorios desactivados',
                  value: remindersOn ? 'ON' : 'OFF',
                  hideChevron: true,
                  onPress: toggleReminders,
                }] : []),
                { icon: 'log-out-outline', label: 'Cerrar sesión', danger: true, hideChevron: true, onPress: handleLogout },
              ]}
            />
          </>
        )}
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

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

type Metric = 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g';

const METRIC_CONFIG: Record<Metric, { label: string; unit: string; color: string; targetKey: keyof typeof METRIC_TARGETS_FALLBACK }> = {
  kcal:      { label: 'Kcal',     unit: 'kcal', color: gradients.brand[1], targetKey: 'kcal' },
  protein_g: { label: 'Proteína', unit: 'g',    color: colors.danger,      targetKey: 'protein_g' },
  carbs_g:   { label: 'Carbos',   unit: 'g',    color: colors.warning,     targetKey: 'carbs_g' },
  fat_g:     { label: 'Grasas',   unit: 'g',    color: colors.accent,      targetKey: 'fat_g' },
};
const METRIC_TARGETS_FALLBACK = { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 65 };

type DayNutrition = { date: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number };

function WeeklyNutritionPanel({ data, profile }: { data: DayNutrition[]; profile: any }) {
  const [metric, setMetric] = useState<Metric>('kcal');
  const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const cfg = METRIC_CONFIG[metric];
  const target = profile[cfg.targetKey] ?? METRIC_TARGETS_FALLBACK[cfg.targetKey];
  const values = data.map((d) => d[metric]);
  const maxVal = Math.max(target * 1.2, ...values);
  const avg = Math.round(values.reduce((s, v) => s + v, 0) / 7);
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <SystemPanel style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SystemText style={styles.sectionLabel}>Progreso semanal</SystemText>
        <SystemText dim style={{ fontSize: 12 }}>
          prom. {avg}{cfg.unit === 'kcal' ? ' kcal' : `g ${cfg.label.toLowerCase()}`}/día
        </SystemText>
      </View>

      {/* Selector de métrica */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => {
          const active = m === metric;
          const c = METRIC_CONFIG[m];
          return (
            <Pressable
              key={m}
              onPress={() => setMetric(m)}
              style={[
                styles.metricTab,
                active && { borderColor: c.color + '80', backgroundColor: c.color + '18' },
              ]}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: active ? c.color : colors.textFaint }}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Barras */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 72 }}>
        {data.map((day) => {
          const val = day[metric];
          const pct = maxVal > 0 ? val / maxVal : 0;
          const barH = Math.max(4, Math.round(pct * 60));
          const overTarget = val > target;
          const dateObj = new Date(day.date + 'T12:00:00');
          const label = DAY_LABELS[dateObj.getDay()];
          const isToday = day.date === todayStr;

          return (
            <View key={day.date} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              {val > 0 && (
                <Text style={{ color: colors.textFaint, fontSize: 9 }}>
                  {metric === 'kcal' && val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
                </Text>
              )}
              <LinearGradient
                colors={overTarget ? [colors.danger, colors.warning] : [cfg.color + 'CC', cfg.color]}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                style={{ width: '100%', height: barH, borderRadius: 4, opacity: val === 0 ? 0.15 : 1 }}
              />
              <Text style={{ fontSize: 10, fontWeight: isToday ? '900' : '600', color: isToday ? colors.text : colors.textFaint }}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </SystemPanel>
  );
}

function WeightSparkline({ data }: { data: Array<{ date: string; weight_kg: number }> }) {
  const W = 260;
  const H = 48;
  if (data.length < 2) return null;
  const values = data.map((d) => d.weight_kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((d.weight_kg - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Simple SVG-like using absolute positioned Views
  const dots = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((d.weight_kg - min) / range) * H;
    return { x, y, v: d.weight_kg };
  });

  return (
    <View style={{ height: H + 12, position: 'relative', marginBottom: 4 }}>
      {dots.slice(0, -1).map((dot, i) => {
        const next = dots[i + 1];
        const dx = next.x - dot.x;
        const dy = next.y - dot.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={i}
            style={{
              position: 'absolute', left: dot.x, top: dot.y,
              width: len, height: 2,
              backgroundColor: gradients.brand[1] + '80',
              transformOrigin: 'left center',
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}
      {dots.map((dot, i) => (
        <View
          key={i}
          style={{
            position: 'absolute', left: dot.x - 3, top: dot.y - 3,
            width: 6, height: 6, borderRadius: 3,
            backgroundColor: i === dots.length - 1 ? gradients.brand[0] : gradients.brand[1] + '99',
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.md, paddingBottom: 100 },

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  username: { fontSize: 32, lineHeight: 34 },
  rankRow: { flexDirection: 'row', justifyContent: 'space-between' },

  sectionLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint, marginBottom: spacing.md },

  charCard: {},
  charRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  charName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  attrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: 96 },
  attrItem: { alignItems: 'center', width: 40 },

  demoBanner: { borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.panelBorder },

  metricTab: {
    flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.panelBorder, backgroundColor: colors.bgElevated,
  },

  weightInput: {
    flex: 1, backgroundColor: colors.bgElevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.panelBorder,
    color: colors.text, fontSize: 15, fontWeight: '600',
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  weightSaveBtn: {
    backgroundColor: gradients.brand[1] + '30',
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: gradients.brand[1] + '60',
  },
  weightSaveBtnText: { color: gradients.brand[1], fontWeight: '800', fontSize: 14 },

  usernameRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  usernameInput: {
    flex: 1, backgroundColor: colors.bgElevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.panelBorder,
    color: colors.text, fontSize: 15, fontWeight: '700',
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  usernameBtn: {
    backgroundColor: gradients.brand[0] + '30',
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: gradients.brand[0] + '60',
  },
  usernameCancelBtn: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.panelBorder,
  },
  usernameBtnText: { color: colors.text, fontWeight: '800', fontSize: 16 },
});
