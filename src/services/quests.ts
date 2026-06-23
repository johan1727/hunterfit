import { supabase } from '../lib/supabase';
import { localDateString } from '../lib/dates';
import type { Quest } from '../types/db';

interface QuestTemplate {
  description_es: string;
  type: 'workout' | 'exercise_count' | 'log_meals' | 'weekly_workouts' | 'weekly_meals' | 'weekly_streak';
  target: number;
  xp_reward: number;
  minLevel: number;
}

const DAILY_TEMPLATES: QuestTemplate[] = [
  { description_es: 'Completa tu entrenamiento del día', type: 'workout', target: 1, xp_reward: 50, minLevel: 1 },
  { description_es: 'Haz 50 sentadillas a lo largo del día', type: 'exercise_count', target: 50, xp_reward: 40, minLevel: 1 },
  { description_es: 'Haz 100 sentadillas a lo largo del día', type: 'exercise_count', target: 100, xp_reward: 60, minLevel: 5 },
  { description_es: 'Haz 30 lagartijas a lo largo del día', type: 'exercise_count', target: 30, xp_reward: 40, minLevel: 3 },
  { description_es: 'Haz 100 lagartijas a lo largo del día', type: 'exercise_count', target: 100, xp_reward: 80, minLevel: 10 },
  { description_es: 'Registra tus 3 comidas principales', type: 'log_meals', target: 3, xp_reward: 30, minLevel: 1 },
  { description_es: 'Haz 60 segundos de plancha acumulados', type: 'exercise_count', target: 60, xp_reward: 40, minLevel: 2 },
  { description_es: 'Camina 20 minutos', type: 'exercise_count', target: 20, xp_reward: 35, minLevel: 1 },
  { description_es: 'Registra 5 comidas o snacks', type: 'log_meals', target: 5, xp_reward: 45, minLevel: 3 },
  { description_es: 'Haz 20 burpees', type: 'exercise_count', target: 20, xp_reward: 60, minLevel: 5 },
  { description_es: 'Completa 200 reps en total', type: 'exercise_count', target: 200, xp_reward: 70, minLevel: 7 },
];

const WEEKLY_TEMPLATES: QuestTemplate[] = [
  { description_es: 'Completa 3 entrenamientos esta semana', type: 'weekly_workouts', target: 3, xp_reward: 150, minLevel: 1 },
  { description_es: 'Completa 5 entrenamientos esta semana', type: 'weekly_workouts', target: 5, xp_reward: 250, minLevel: 5 },
  { description_es: 'Registra comidas los 5 días de la semana', type: 'weekly_meals', target: 5, xp_reward: 120, minLevel: 1 },
  { description_es: 'Mantén una racha de 7 días', type: 'weekly_streak', target: 7, xp_reward: 300, minLevel: 3 },
  { description_es: 'Completa 7 entrenamientos esta semana', type: 'weekly_workouts', target: 7, xp_reward: 400, minLevel: 10 },
  { description_es: 'Registra comidas todos los días de la semana', type: 'weekly_meals', target: 7, xp_reward: 200, minLevel: 5 },
];

function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // domingo de esta semana
  return d.toISOString().split('T')[0];
}

/** Devuelve las misiones de hoy; si no existen, las genera (3 por día según nivel). */
export async function getOrCreateDailyQuests(userId: string, level: number): Promise<Quest[]> {
  const today = localDateString();
  const { data: existing, error } = await supabase
    .from('quests').select('*').eq('user_id', userId).eq('date', today);
  if (error) throw error;
  if (existing && existing.length > 0) return existing as Quest[];

  const eligible = DAILY_TEMPLATES.filter((t) => t.minLevel <= level);
  const fixed = eligible.filter((t) => t.type === 'workout' || t.type === 'log_meals');
  const extras = eligible.filter((t) => t.type === 'exercise_count');
  const random = extras[Math.floor(Math.random() * extras.length)];
  const chosen = [...fixed.slice(0, 2), random].filter(Boolean);

  const rows = chosen.map((t) => ({
    user_id: userId,
    date: today,
    description_es: t.description_es,
    type: t.type,
    target: t.target,
    xp_reward: t.xp_reward,
  }));
  const { data: created, error: insErr } = await supabase.from('quests').insert(rows).select();
  if (insErr) throw insErr;
  return created as Quest[];
}

/** Devuelve las misiones semanales; si no existen, las genera (2 por semana según nivel). */
export async function getOrCreateWeeklyQuests(userId: string, level: number): Promise<Quest[]> {
  const weekStart = getWeekKey();
  const { data: existing } = await supabase
    .from('quests').select('*').eq('user_id', userId).eq('date', weekStart).like('type', 'weekly_%');
  if (existing && existing.length > 0) return existing as Quest[];

  const eligible = WEEKLY_TEMPLATES.filter((t) => t.minLevel <= level);
  // Siempre incluye una de entrenamientos + una extra
  const workoutQ = eligible.filter((t) => t.type === 'weekly_workouts');
  const otherQ = eligible.filter((t) => t.type !== 'weekly_workouts');
  const chosen = [
    workoutQ[Math.min(Math.floor(level / 5), workoutQ.length - 1)],
    otherQ[Math.floor(Math.random() * otherQ.length)],
  ].filter(Boolean);

  const rows = chosen.map((t) => ({
    user_id: userId,
    date: weekStart,
    description_es: t.description_es,
    type: t.type,
    target: t.target,
    xp_reward: t.xp_reward,
  }));
  const { data: created, error } = await supabase.from('quests').insert(rows).select();
  if (error) throw error;
  return (created ?? []) as Quest[];
}

export async function updateQuestProgress(quest: Quest, progress: number) {
  const completed = progress >= quest.target;
  const { error } = await supabase
    .from('quests')
    .update({ progress, completed })
    .eq('id', quest.id);
  if (error) throw error;
  if (completed && !quest.completed) {
    await supabase.rpc('grant_xp', { amount: quest.xp_reward });
  }
  return completed;
}
