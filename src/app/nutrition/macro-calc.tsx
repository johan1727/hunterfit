import { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useProfile, useUpdateProfile } from '../../hooks/useData';
import { calculateTargets } from '../../services/nutrition';
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground, GradientText, Pill, ProgressBar,
  SystemPanel, SystemWindowPanel, SystemText, SystemButton, SystemInput,
} from '../../components/system';

const GOAL_OPTIONS = [
  { key: 'definicion', label: 'Definición',    desc: 'Déficit calórico para quemar grasa' },
  { key: 'masa',       label: 'Ganar masa',    desc: 'Superávit para construir músculo' },
  { key: 'general',   label: 'Mantenimiento', desc: 'Calorías de equilibrio' },
  { key: 'fuerza',    label: 'Fuerza',        desc: 'Alto en proteína y calorías' },
] as const;

export default function MacroCalcScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { data: profile } = useProfile(userId);
  const updateProfile = useUpdateProfile(userId);

  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [saving, setSaving] = useState(false);

  // Auto fields
  const [goal, setGoal] = useState(profile?.goal ?? 'general');
  const [activityLevel, setActivityLevel] = useState(profile?.activity_level ?? 'moderado');

  // Manual fields
  const [kcal, setKcal]       = useState(String(profile?.calorie_target ?? ''));
  const [protein, setProtein] = useState(String(profile?.protein_g ?? ''));
  const [carbs, setCarbs]     = useState(String(profile?.carbs_g ?? ''));
  const [fat, setFat]         = useState(String(profile?.fat_g ?? ''));

  // Preview: auto-calculated from profile biometrics + selected goal
  const preview = profile ? calculateTargets({
    sex: profile.sex ?? 'm',
    age: profile.age ?? 25,
    height_cm: profile.height_cm ?? 170,
    weight_kg: profile.weight_kg ?? 70,
    activity_level: activityLevel as any,
    goal: goal as any,
  }) : null;

  async function handleSaveAuto() {
    if (!preview) return;
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        goal: goal as any,
        activity_level: activityLevel as any,
        calorie_target: preview.calorie_target,
        protein_g: preview.protein_g,
        carbs_g: preview.carbs_g,
        fat_g: preview.fat_g,
      } as any);
      Alert.alert('¡Listo!', 'Metas actualizadas');
      router.back();
    } catch {
      Alert.alert('Error', 'No se pudieron guardar las metas');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveManual() {
    const k = parseFloat(kcal);
    const p = parseFloat(protein);
    const c = parseFloat(carbs);
    const f = parseFloat(fat);
    if (isNaN(k) || k < 500 || k > 10000) {
      Alert.alert('Calorías inválidas', 'Ingresa un valor entre 500 y 10,000 kcal');
      return;
    }
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        calorie_target: Math.round(k),
        protein_g: isNaN(p) ? undefined : Math.round(p),
        carbs_g: isNaN(c) ? undefined : Math.round(c),
        fat_g: isNaN(f) ? undefined : Math.round(f),
      } as any);
      Alert.alert('¡Listo!', 'Metas personalizadas guardadas');
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const macroKcal = {
    protein: (parseFloat(protein) || 0) * 4,
    carbs:   (parseFloat(carbs)   || 0) * 4,
    fat:     (parseFloat(fat)     || 0) * 9,
  };
  const manualTotal = macroKcal.protein + macroKcal.carbs + macroKcal.fat;

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <Pill dotColor={gradients.brand[0]}>Nutrición</Pill>
          <GradientText style={styles.title}>Calculadora{'\n'}de macros</GradientText>
          <SystemText dim style={{ fontSize: 14 }}>
            Ajusta tus metas calóricas y de macronutrientes
          </SystemText>
        </Animated.View>

        {/* Modo selector */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['auto', 'manual'] as const).map((m) => (
            <SystemButton
              key={m}
              title={m === 'auto' ? 'Calculadora automática' : 'Ingresar manual'}
              variant={mode === m ? 'gradient' : 'ghost'}
              onPress={() => setMode(m)}
              style={{ flex: 1 }}
            />
          ))}
        </Animated.View>

        {mode === 'auto' ? (
          <>
            {/* Objetivo */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <SystemWindowPanel style={{ gap: spacing.md }}>
                <SystemText style={styles.sectionLabel}>Objetivo</SystemText>
                {GOAL_OPTIONS.map((g) => (
                  <SystemButton
                    key={g.key}
                    title={g.label}
                    variant={goal === g.key ? 'gradient' : 'ghost'}
                    onPress={() => setGoal(g.key)}
                  />
                ))}
              </SystemWindowPanel>
            </Animated.View>

            {/* Preview resultado */}
            {preview && (
              <Animated.View entering={FadeInDown.delay(160).springify()}>
                <SystemPanel style={{ gap: spacing.md }}>
                  <SystemText style={styles.sectionLabel}>Tu meta calculada</SystemText>
                  <View style={styles.previewGrid}>
                    <MacroPreviewCell label="Calorías" value={`${preview.calorie_target}`} unit="kcal" color={gradients.brand[1]} />
                    <MacroPreviewCell label="Proteína" value={`${preview.protein_g}`} unit="g" color={colors.danger} />
                    <MacroPreviewCell label="Carbos"   value={`${preview.carbs_g}`}   unit="g" color={colors.warning} />
                    <MacroPreviewCell label="Grasas"   value={`${preview.fat_g}`}     unit="g" color={colors.accent} />
                  </View>
                  <MacroDistBar protein={preview.protein_g} carbs={preview.carbs_g} fat={preview.fat_g} />
                </SystemPanel>
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(220).springify()}>
              <SystemButton title="Guardar estas metas" variant="gradient" loading={saving} onPress={handleSaveAuto} />
            </Animated.View>
          </>
        ) : (
          <>
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <SystemWindowPanel style={{ gap: spacing.md }}>
                <SystemText style={styles.sectionLabel}>Ingresa tus metas</SystemText>

                <View>
                  <SystemText dim style={{ fontSize: 12, marginBottom: 6 }}>Calorías diarias *</SystemText>
                  <SystemInput placeholder="2000" value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" />
                </View>
                <View style={styles.macroRow}>
                  <View style={{ flex: 1 }}>
                    <SystemText dim style={{ fontSize: 12, marginBottom: 6, color: colors.danger }}>Proteína (g)</SystemText>
                    <SystemInput placeholder="150" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SystemText dim style={{ fontSize: 12, marginBottom: 6, color: colors.warning }}>Carbos (g)</SystemText>
                    <SystemInput placeholder="200" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SystemText dim style={{ fontSize: 12, marginBottom: 6, color: colors.accent }}>Grasas (g)</SystemText>
                    <SystemInput placeholder="65" value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
                  </View>
                </View>

                {/* Balance kcal vs macros */}
                {manualTotal > 0 && (
                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <SystemText dim style={{ fontSize: 12 }}>Kcal de macros</SystemText>
                      <Text style={{ color: Math.abs(manualTotal - parseFloat(kcal || '0')) < 50 ? colors.success : colors.warning, fontSize: 12, fontWeight: '700' }}>
                        {Math.round(manualTotal)} / {kcal || '0'} kcal
                      </Text>
                    </View>
                    <MacroDistBar protein={parseFloat(protein) || 0} carbs={parseFloat(carbs) || 0} fat={parseFloat(fat) || 0} />
                  </View>
                )}
              </SystemWindowPanel>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(160).springify()}>
              <SystemButton title="Guardar metas personalizadas" variant="gradient" loading={saving} onPress={handleSaveManual} />
            </Animated.View>
          </>
        )}

        <SystemButton title="← Volver" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroPreviewCell({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={{ color, fontSize: 22, fontWeight: '900' }}>{value}</Text>
      <SystemText dim style={{ fontSize: 10 }}>{unit}</SystemText>
      <SystemText dim style={{ fontSize: 10 }}>{label}</SystemText>
    </View>
  );
}

function MacroDistBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  if (total === 0) return null;
  const pPct = (protein * 4 / total) * 100;
  const cPct = (carbs   * 4 / total) * 100;
  const fPct = (fat     * 9 / total) * 100;
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
        <View style={{ width: `${pPct}%`, backgroundColor: colors.danger }} />
        <View style={{ width: `${cPct}%`, backgroundColor: colors.warning }} />
        <View style={{ flex: 1,           backgroundColor: colors.accent }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: colors.danger,  fontSize: 10 }}>{Math.round(pPct)}% P</Text>
        <Text style={{ color: colors.warning, fontSize: 10 }}>{Math.round(cPct)}% C</Text>
        <Text style={{ color: colors.accent,  fontSize: 10 }}>{Math.round(fPct)}% G</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md, paddingBottom: 80 },
  header: { gap: spacing.sm },
  title: { fontSize: 38, lineHeight: 42, fontWeight: '900' },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint },
  previewGrid: { flexDirection: 'row', gap: spacing.sm },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
});
