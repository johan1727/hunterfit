import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { completeWorkout } from '../../services/routines';
import { colors, spacing } from '../../theme/system';
import { SystemPanel, SystemTitle, SystemText, SystemButton, StatRow } from '../../components/system';

interface ExerciseSession {
  exercise_id: number;
  name: string;
  sets: number;
  reps?: number;
  seconds?: number;
  rest_seconds: number;
  currentSet: number;
  completed: boolean;
}

export default function WorkoutScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { id: routineId } = useLocalSearchParams();
  const [routine, setRoutine] = React.useState<any>(null);
  const [exercises, setExercises] = useState<ExerciseSession[]>([]);
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [completing, setCompleting] = useState(false);

  React.useEffect(() => {
    loadRoutine();
  }, [routineId]);

  React.useEffect(() => {
    let interval: any;
    if (timerRunning && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0 && timerRunning) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timer]);

  async function loadRoutine() {
    try {
      const { data: rout } = await supabase
        .from('routines')
        .select('*')
        .eq('id', routineId)
        .single();

      const { data: exs } = await supabase
        .from('routine_exercises')
        .select('*, exercise:exercises(*)')
        .eq('routine_id', routineId)
        .order('position');

      setRoutine(rout);
      setExercises(
        exs?.map((e: any) => ({
          exercise_id: e.exercise_id,
          name: e.exercise.name_es,
          sets: e.sets,
          reps: e.reps,
          seconds: e.seconds,
          rest_seconds: e.rest_seconds,
          currentSet: 1,
          completed: false,
        })) || []
      );
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  const currentEx = exercises[currentExIndex];
  const progress = exercises.filter((e) => e.completed).length;

  function nextExercise() {
    if (currentExIndex < exercises.length - 1) {
      setCurrentExIndex(currentExIndex + 1);
      setTimer(0);
      setTimerRunning(false);
    }
  }

  async function handleComplete() {
    try {
      setCompleting(true);
      const xp = 100 + exercises.length * 5;
      await completeWorkout(userId!, routineId as string, new Date(), [], xp);
      Alert.alert('¡Felicidades!', `+${xp} XP ganados`, [
        { text: 'OK', onPress: () => router.replace('/(tabs)/home') },
      ]);
    } catch (err) {
      Alert.alert('Error', 'No se pudo completar el entrenamiento');
      console.error(err);
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <SystemPanel>
          <SystemText>Cargando entrenamiento...</SystemText>
        </SystemPanel>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {currentEx ? (
        <>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((progress + 1) / exercises.length) * 100}%` },
              ]}
            />
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            <SystemPanel style={styles.header}>
              <SystemTitle>{routine.name}</SystemTitle>
              <SystemText style={{ marginTop: spacing.sm }}>
                Ejercicio {currentExIndex + 1} de {exercises.length}
              </SystemText>
            </SystemPanel>

            <SystemPanel>
              <Text style={styles.exerciseName}>{currentEx.name}</Text>
              <View style={styles.repsContainer}>
                <View style={styles.repsBox}>
                  <Text style={styles.repsLabel}>SERIES</Text>
                  <Text style={styles.repsValue}>{currentEx.sets}</Text>
                </View>
                {currentEx.reps && (
                  <View style={styles.repsBox}>
                    <Text style={styles.repsLabel}>REPS</Text>
                    <Text style={styles.repsValue}>{currentEx.reps}</Text>
                  </View>
                )}
                {currentEx.seconds && (
                  <View style={styles.repsBox}>
                    <Text style={styles.repsLabel}>SEGUNDOS</Text>
                    <Text style={styles.repsValue}>{currentEx.seconds}s</Text>
                  </View>
                )}
                <View style={styles.repsBox}>
                  <Text style={styles.repsLabel}>DESCANSO</Text>
                  <Text style={styles.repsValue}>{currentEx.rest_seconds}s</Text>
                </View>
              </View>

              <Pressable
                style={styles.timerButton}
                onPress={() => {
                  if (!timerRunning && timer === 0) {
                    setTimer(currentEx.rest_seconds);
                    setTimerRunning(true);
                  } else {
                    setTimerRunning(!timerRunning);
                  }
                }}
              >
                <Text style={styles.timerText}>
                  {timerRunning ? '⏸' : '▶'} {timer}s
                </Text>
              </Pressable>

              <View style={styles.buttonRow}>
                <SystemButton
                  title="COMPLETAR EJERCICIO"
                  onPress={() => {
                    const newExercises = [...exercises];
                    newExercises[currentExIndex].completed = true;
                    setExercises(newExercises);
                    nextExercise();
                  }}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
              </View>
            </SystemPanel>
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <SystemPanel style={styles.header}>
            <SystemTitle>¡ENTRENAMIENTO COMPLETADO!</SystemTitle>
          </SystemPanel>

          <SystemPanel>
            <SystemText style={{ fontSize: 18, marginBottom: spacing.lg }}>
              Excelente trabajo, Cazador
            </SystemText>
            <StatRow label="Ejercicios" value={exercises.length} />
            <StatRow label="Series Totales" value={exercises.reduce((a, e) => a + e.sets, 0)} />
            <StatRow label="XP a Ganar" value={`+${100 + exercises.length * 5}`} />

            <SystemButton
              title="CONFIRMAR ENTRENAMIENTO"
              loading={completing}
              onPress={handleComplete}
            />
          </SystemPanel>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.lg },
  progressBar: { height: 8, backgroundColor: colors.bgElevated, width: '100%' },
  progressFill: { height: '100%', backgroundColor: colors.glow },
  header: { marginBottom: spacing.lg },
  exerciseName: { color: colors.glow, fontSize: 22, fontWeight: '700', marginBottom: spacing.lg },
  repsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.lg },
  repsBox: { alignItems: 'center', padding: spacing.md, backgroundColor: colors.bgElevated, borderRadius: 10 },
  repsLabel: { color: colors.textDim, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  repsValue: { color: colors.glow, fontSize: 20, fontWeight: '800' },
  timerButton: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  timerText: { color: colors.white, fontSize: 28, fontWeight: '800' },
  buttonRow: { flexDirection: 'row' },
});
