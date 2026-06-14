import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Pressable, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useUpdateProfile } from '../../hooks/useData';
import { calculateTargets } from '../../services/nutrition';
import { colors, spacing } from '../../theme/system';
import { SystemPanel, SystemTitle, SystemText, SystemButton, ProgressBar } from '../../components/system';

const questions = [
  { key: 'sex', label: 'Sexo', options: ['Masculino', 'Femenino', 'Otro'], values: ['m', 'f', 'otro'] },
  { key: 'age', label: '¿Cuántos años tienes?', options: ['13-20', '21-30', '31-40', '41-50', '50+'], values: [17, 25, 35, 45, 55] },
  { key: 'height_cm', label: 'Altura (cm)', input: true, placeholder: '175' },
  { key: 'weight_kg', label: 'Peso (kg)', input: true, placeholder: '75' },
  { key: 'activity', label: 'Nivel de Actividad', options: ['Sedentario', 'Ligero', 'Moderado', 'Activo', 'Muy Activo'], values: ['sedentario', 'ligero', 'moderado', 'activo', 'muy_activo'] },
  { key: 'goal', label: '¿Cuál es tu objetivo?', options: ['Definición', 'Masa Muscular', 'Agilidad', 'Movilidad', 'Fuerza', 'General'], values: ['definicion', 'masa', 'agilidad', 'movilidad', 'fuerza', 'general'] },
  { key: 'trainingDays', label: '¿Días disponibles para entrenar?', options: ['1-2', '3-4', '5-6', '7'], values: [1, 3, 5, 7] },
  { key: 'fitnessLevel', label: 'Nivel de Condición Física', options: ['Principiante', 'Intermedio', 'Avanzado'], values: ['principiante', 'intermedio', 'avanzado'] },
];

export default function QuizScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const updateProfile = useUpdateProfile(userId);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [inputValue, setInputValue] = useState('');

  const question = questions[step];
  const progress = (step + 1) / questions.length;

  const handleAnswer = (value: any) => {
    setAnswers({ ...answers, [question.key]: value });
    setTimeout(() => nextStep(), 200);
  };

  const handleInputSubmit = () => {
    if (inputValue) {
      setAnswers({ ...answers, [question.key]: parseFloat(inputValue) });
      setInputValue('');
      nextStep();
    }
  };

  const nextStep = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  async function handleComplete() {
    const targets = calculateTargets({
      sex: answers.sex,
      age: answers.age,
      height_cm: answers.height_cm,
      weight_kg: answers.weight_kg,
      activity_level: answers.activity,
      goal: answers.goal,
    });

    await updateProfile.mutateAsync({
      sex: answers.sex,
      age: answers.age,
      height_cm: answers.height_cm,
      weight_kg: answers.weight_kg,
      activity_level: answers.activity,
      goal: answers.goal,
      training_days_per_week: answers.trainingDays,
      fitness_level: answers.fitnessLevel,
      calorie_target: targets.calorie_target,
      protein_g: targets.protein_g,
      carbs_g: targets.carbs_g,
      fat_g: targets.fat_g,
    });

    router.push('/onboarding/character-select');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SystemPanel style={styles.header}>
          <SystemTitle>CUESTIONARIO DEL SISTEMA</SystemTitle>
          <ProgressBar progress={progress} />
          <SystemText style={{ marginTop: spacing.md }}>
            Paso {step + 1} de {questions.length}
          </SystemText>
        </SystemPanel>

        <SystemPanel>
          <Text style={styles.questionTitle}>{question.label}</Text>

          {question.input ? (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder={question.placeholder}
                  value={inputValue}
                  onChangeText={setInputValue}
                  keyboardType="decimal-pad"
                />
              </View>
              <SystemButton title="SIGUIENTE" onPress={handleInputSubmit} />
            </>
          ) : (
            <>
              {question.options!.map((opt, i) => (
                <Pressable
                  key={i}
                  style={[
                    styles.optionButton,
                    answers[question.key] === question.values![i] && styles.optionActive,
                  ]}
                  onPress={() => handleAnswer(question.values![i])}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              ))}
            </>
          )}
        </SystemPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.lg },
  header: { marginBottom: spacing.lg },
  questionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  optionButton: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionActive: {
    borderColor: colors.glow,
    backgroundColor: `${colors.primary}15`,
  },
  optionText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  inputContainer: { marginBottom: spacing.lg },
  textInput: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
});
