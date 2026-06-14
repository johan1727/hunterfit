import { supabase } from '../lib/supabase';
import { localDateString } from '../lib/dates';
import type { Quest } from '../types/db';

interface QuestTemplate {
  description_es: string;
  type: 'workout' | 'exercise_count' | 'log_meals';
  target: number;
  xp_reward: number;
  minLevel: number;
}

const TEMPLATES: QuestTemplate[] = [
  { description_es: 'Completa tu entrenamiento del día', type: 'workout', target: 1, xp_reward: 50, minLevel: 1 },
  { description_es: 'Haz 50 sentadillas a lo largo del día', type: 'exercise_count', target: 50, xp_reward: 40, minLevel: 1 },
  { description_es: 'Haz 100 sentadillas a lo largo del día', type: 'exercise_count', target: 100, xp_reward: 60, minLevel: 5 },
  { description_es: 'Haz 30 lagartijas a lo largo del día', type: 'exercise_count', target: 30, xp_reward: 40, minLevel: 3 },
  { description_es: 'Haz 100 lagartijas a lo largo del día', type: 'exercise_count', target: 100, xp_reward: 80, minLevel: 10 },
  { description_es: 'Registra tus 3 comidas principales', type: 'log_meals', target: 3, xp_reward: 30, minLevel: 1 },
  { description_es: 'Haz 60 segundos de plancha acumulados', type: 'exercise_count', target: 60, xp_reward: 40, minLevel: 2 },
  { description_es: 'Camina 20 minutos', type: 'exercise_count', target: 20, xp_reward: 35, minLevel: 1 },
];

/** Devuelve las misiones de hoy; si no existen, las genera (3 por día según nivel). */
export async function getOrCreateDailyQuests(userId: string, level: number): Promise<Quest[]> {
  const today = localDateString();
  const { data: existing, error } = await supabase
    .from('quests').select('*').eq('user_id', userId).eq('date', today);
  if (error) throw error;
  if (existing && existing.length > 0) return existing as Quest[];

  const eligible = TEMPLATES.filter((t) => t.minLevel <= level);
  // Siempre incluye entrenar + registrar comidas, más una aleatoria
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
