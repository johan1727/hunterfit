import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useUpdateProfile } from '../../hooks/useData';
import { calculateTargets } from '../../services/nutrition';
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground,
  GradientText,
  Pill,
  SystemWindowPanel,
  SystemText,
  SystemButton,
  ProgressBar,
} from '../../components/system';

const questions = [
  { key: 'username', label: '¿Cómo te llamas, cazador?', text: true, placeholder: 'Ej: Shadow_Hunter99', maxLength: 24 },
  { key: 'sex', label: '¿Cuál es tu sexo?', options: ['Masculino', 'Femenino', 'Otro'], values: ['m', 'f', 'otro'] },
  { key: 'age', label: '¿Cuántos años tienes?', options: ['13–20', '21–30', '31–40', '41–50', '50+'], values: [17, 25, 35, 45, 55] },
  { key: 'height_cm', label: 'Altura', stepper: true, unit: 'cm', min: 140, max: 220, default: 170, step: 1 },
  { key: 'weight_kg', label: 'Peso', stepper: true, unit: 'kg', min: 40, max: 200, default: 70, step: 0.5 },
  { key: 'activity', label: 'Nivel de actividad', options: ['Sedentario', 'Ligero', 'Moderado', 'Activo', 'Muy activo'], values: ['sedentario', 'ligero', 'moderado', 'activo', 'muy_activo'] },
  { key: 'goal', label: '¿Cuál es tu objetivo?', options: ['Definición', 'Masa muscular', 'Agilidad', 'Movilidad', 'Fuerza', 'General'], values: ['definicion', 'masa', 'agilidad', 'movilidad', 'fuerza', 'general'] },
  { key: 'trainingDays', label: 'Días disponibles para entrenar', options: ['1–2 días', '3–4 días', '5–6 días', 'Todos los días'], values: [1, 3, 5, 7] },
  { key: 'fitnessLevel', label: 'Nivel de condición física', options: ['Principiante', 'Intermedio', 'Avanzado'], values: ['principiante', 'intermedio', 'avanzado'] },
] as const;

export default function QuizScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const updateProfile = useUpdateProfile(userId);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [textInput, setTextInput] = useState('');
  const params = useLocalSearchParams<{ from?: string }>();
  const fromProfile = params.from === 'profile';


  const question = questions[step];
  const progress = step / questions.length;

  const handleAnswer = (value: any) => {
    const next = { ...answers, [question.key]: value };
    setAnswers(next);
    setTimeout(() => advanceStep(next), 180);
  };

  const handleTextSubmit = () => {
    const val = textInput.trim();
    if (!val) return;
    const next = { ...answers, [question.key]: val };
    setAnswers(next);
    setTextInput('');
    advanceStep(next);
  };

  const handleStepperChange = (delta: number) => {
    const qAny = question as any;
    const cur: number = answers[question.key] ?? qAny.default ?? qAny.min;
    const next = Math.min(qAny.max, Math.max(qAny.min, Math.round((cur + delta) * 10) / 10));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAnswers((prev) => ({ ...prev, [question.key]: next }));
  };

  const handleStepperSubmit = () => {
    const qAny = question as any;
    const val: number = answers[question.key] ?? qAny.default;
    const next = { ...answers, [question.key]: val };
    setAnswers(next);
    advanceStep(next);
  };

  const advanceStep = (ans: Record<string, any>) => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete(ans);
    }
  };

  async function handleComplete(ans: Record<string, any>) {
    const targets = calculateTargets({
      sex: ans.sex, age: ans.age,
      height_cm: ans.height_cm, weight_kg: ans.weight_kg,
      activity_level: ans.activity, goal: ans.goal,
    });
    // upsert crea la fila si el usuario llegó por Google OAuth y no tiene perfil aún
    const patch: Record<string, any> = {
      username: ans.username,
      sex: ans.sex, age: ans.age,
      height_cm: ans.height_cm, weight_kg: ans.weight_kg,
      activity_level: ans.activity, goal: ans.goal,
      training_days_per_week: ans.trainingDays,
      fitness_level: ans.fitnessLevel,
      calorie_target: targets.calorie_target,
      protein_g: targets.protein_g,
      carbs_g: targets.carbs_g,
      fat_g: targets.fat_g,
    };
    // Solo en primera vez: marcar onboarding incompleto hasta body-photo, e inicializar stats
    if (!fromProfile) {
      patch.onboarding_complete = false;
      patch.xp = 0; patch.level = 1; patch.rank = 'E'; patch.streak_days = 0;
    }
    await updateProfile.mutateAsync(patch as any);
    fromProfile ? router.replace('/(tabs)/profile') : router.push('/onboarding/character-select');
  }

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pill dotColor={gradients.brand[0]}>Sistema de cazadores</Pill>
            <Pressable
              onPress={async () => {
                // Marca onboarding como completo para no quedar en loop
                try { await updateProfile.mutateAsync({ onboarding_complete: true } as any); } catch {}
                router.replace('/(tabs)/home');
              }}
              style={{ paddingVertical: 6, paddingHorizontal: 12 }}
            >
              <SystemText dim style={{ fontSize: 13 }}>Salir ×</SystemText>
            </Pressable>
          </View>
          <GradientText style={styles.title}>Cuestionario{'\n'}del Sistema</GradientText>
        </View>

        {/* Progress */}
        <View style={styles.progressWrap}>
          <View style={styles.progressRow}>
            <Pressable
              onPress={() => step > 0 && setStep(step - 1)}
              style={{ opacity: step > 0 ? 1 : 0 }}
              disabled={step === 0}
            >
              <SystemText dim style={{ fontSize: 13 }}>← Anterior</SystemText>
            </Pressable>
            <SystemText dim style={styles.stepText}>{step + 1} / {questions.length}</SystemText>
          </View>
          <ProgressBar progress={progress} height={4} />
        </View>

        {/* Question card */}
        <SystemWindowPanel style={styles.card}>
          <SystemText style={styles.questionLabel}>{question.label}</SystemText>

          {(question as any).text ? (
            <>
              <TextInput
                style={styles.textInput}
                placeholder={(question as any).placeholder}
                placeholderTextColor={colors.textFaint}
                value={textInput}
                onChangeText={setTextInput}
                maxLength={(question as any).maxLength ?? 32}
                autoFocus
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleTextSubmit}
              />
              <SystemButton
                title="Siguiente →"
                variant="gradient"
                onPress={handleTextSubmit}
                disabled={!textInput.trim()}
                style={{ marginTop: spacing.md }}
              />
            </>
          ) : (question as any).stepper ? (
            <>
              <View style={styles.stepperWrap}>
                {/* Botón − */}
                <Pressable
                  style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
                  onPress={() => handleStepperChange(-(question as any).step)}
                  onLongPress={() => handleStepperChange(-(question as any).step * 5)}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </Pressable>

                {/* Valor central */}
                <View style={styles.stepperValue}>
                  <LinearGradient
                    colors={gradients.brand as any}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.stepperGradientText}
                  >
                    <Text style={styles.stepperNum}>
                      {(answers[question.key] ?? (question as any).default).toFixed(
                        (question as any).step < 1 ? 1 : 0
                      )}
                    </Text>
                  </LinearGradient>
                  <SystemText dim style={{ fontSize: 16, marginTop: 4 }}>
                    {(question as any).unit}
                  </SystemText>
                </View>

                {/* Botón + */}
                <Pressable
                  style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
                  onPress={() => handleStepperChange((question as any).step)}
                  onLongPress={() => handleStepperChange((question as any).step * 5)}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </Pressable>
              </View>

              <SystemText dim style={{ fontSize: 12, textAlign: 'center', marginTop: spacing.sm }}>
                Mantén presionado para cambiar rápido
              </SystemText>

              <SystemButton
                title="Siguiente →"
                variant="gradient"
                onPress={handleStepperSubmit}
                style={{ marginTop: spacing.md }}
              />
            </>
          ) : (
            <View style={styles.optionsGrid}>
              {(question as any).options.map((opt: string, i: number) => {
                const selected = answers[question.key] === (question as any).values[i];
                return (
                  <Pressable key={i} onPress={() => handleAnswer((question as any).values[i])}>
                    {selected ? (
                      <LinearGradient
                        colors={gradients.brand as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.optionGradientWrap}
                      >
                        <View style={styles.optionInnerSelected}>
                          <SystemText style={styles.optionTextSelected}>{opt}</SystemText>
                        </View>
                      </LinearGradient>
                    ) : (
                      <View style={styles.optionNormal}>
                        <SystemText style={styles.optionText}>{opt}</SystemText>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </SystemWindowPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    padding: spacing.lg, paddingTop: spacing.xl,
    gap: spacing.lg, paddingBottom: 60,
  },

  header: { gap: spacing.sm },
  title: { fontSize: 42, lineHeight: 46, fontWeight: '900' },

  progressWrap: { gap: spacing.sm },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepText: { fontSize: 12, letterSpacing: 0.5 },

  card: { gap: spacing.md },
  questionLabel: { fontSize: 20, fontWeight: '700', color: colors.text, lineHeight: 28 },

  stepperWrap: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  stepBtn: {
    width: 64, height: 64, borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.panelBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnPressed: { opacity: 0.6, transform: [{ scale: 0.94 }] },
  stepBtnText: { color: colors.text, fontSize: 28, fontWeight: '300', lineHeight: 32 },
  stepperValue: { flex: 1, alignItems: 'center', gap: 4 },
  stepperGradientText: { borderRadius: radius.sm, paddingHorizontal: spacing.sm },
  stepperNum: {
    fontSize: 56, fontWeight: '900', color: '#fff',
    letterSpacing: -2, lineHeight: 64, textAlign: 'center',
  },

  textInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  optionsGrid: { gap: spacing.sm },
  optionGradientWrap: { borderRadius: radius.md + 1, padding: 1.5 },
  optionInnerSelected: {
    backgroundColor: `${colors.bg}E0`,
    borderRadius: radius.md,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  optionTextSelected: { color: colors.text, fontSize: 15, fontWeight: '700' },
  optionNormal: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  optionText: { color: colors.textDim, fontSize: 15, fontWeight: '600' },
});
