import { supabase } from '../lib/supabase';
import type { Character, Exercise, FitnessLevel, Routine, RoutineExercise } from '../types/db';
import { generateWeeklyPlan } from './routineGenerator';

export interface RoutineWithExercises extends Routine {
  routine_exercises: (RoutineExercise & { exercise: Exercise })[];
}

/** Borra el plan anterior y genera + guarda el nuevo plan semanal. */
export async function regeneratePlan(
  userId: string,
  character: Character,
  fitnessLevel: FitnessLevel,
  daysPerWeek: number,
  allExercises: Exercise[],
  priorityGroups: string[] = []
): Promise<void> {
  const plan = generateWeeklyPlan(character, fitnessLevel, daysPerWeek, allExercises, priorityGroups);

  await supabase.from('routines').delete().eq('user_id', userId);

  for (let i = 0; i < plan.length; i++) {
    const day = plan[i];
    const { data: routine, error } = await supabase
      .from('routines')
      .insert({
        user_id: userId,
        character_id: character.id,
        day_index: i,
        name: day.name,
        focus: day.focus,
      })
      .select()
      .single();
    if (error) throw error;

    const rows = day.exercises.map((e, pos) => ({
      routine_id: routine.id,
      exercise_id: e.exercise.id,
      position: pos,
      sets: e.sets,
      reps: e.reps,
      seconds: e.seconds,
      rest_seconds: e.rest_seconds,
    }));
    const { error: exErr } = await supabase.from('routine_exercises').insert(rows);
    if (exErr) throw exErr;
  }
}

export async function fetchPlan(userId: string): Promise<RoutineWithExercises[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('*, routine_exercises:routine_exercises(*, exercise:exercises(*))')
    .eq('user_id', userId)
    .order('day_index');
  if (error) throw error;
  return (data as RoutineWithExercises[]).map((r) => ({
    ...r,
    routine_exercises: [...(r.routine_exercises ?? [])].sort((a, b) => a.position - b.position),
  }));
}

/** Registra la sesión completada y otorga XP. Devuelve el perfil actualizado. */
export async function completeWorkout(
  userId: string,
  routineId: string,
  startedAt: Date,
  exercisesCompleted: { exercise_id: number; sets_done: number }[],
  xp: number
) {
  const { error } = await supabase.from('workout_sessions').insert({
    user_id: userId,
    routine_id: routineId,
    started_at: startedAt.toISOString(),
    completed_at: new Date().toISOString(),
    xp_earned: xp,
    exercises_completed: exercisesCompleted,
  });
  if (error) throw error;
  const { data: profile, error: xpErr } = await supabase.rpc('grant_xp', { amount: xp });
  if (xpErr) throw xpErr;
  return profile;
}
