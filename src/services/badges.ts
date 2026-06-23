import { supabase } from '../lib/supabase';
import { useBadgeStore } from '../lib/badgeStore';

export interface Badge {
  id: number;
  slug: string;
  name_es: string;
  description_es: string;
  icon: string;
  category: string;
  xp_reward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserBadge {
  id: number;
  badge_id: number;
  earned_at: string;
  badge: Badge;
}

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('*, badge:badges(*)')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserBadge[];
}

export async function getAllBadges(): Promise<Badge[]> {
  const { data, error } = await supabase.from('badges').select('*').order('id');
  if (error) throw error;
  return (data ?? []) as Badge[];
}

export async function awardBadge(userId: string, slug: string): Promise<Badge | null> {
  const { data: badge } = await supabase.from('badges').select('*').eq('slug', slug).single();
  if (!badge) return null;
  const { error } = await supabase
    .from('user_badges')
    .insert({ user_id: userId, badge_id: badge.id });
  if (error?.code === '23505') return null; // ya tiene el badge
  if (error) throw error;
  await supabase.rpc('grant_xp', { amount: badge.xp_reward ?? 0 });
  // Encolar en el store para mostrar el toast
  useBadgeStore.getState().enqueue(badge as Badge);
  return badge as Badge;
}

/** Chequea y otorga badges según el estado actual del usuario. Llamar después de eventos clave. */
export async function checkAndAwardBadges(userId: string, context: {
  totalWorkouts?: number;
  totalSets?: number;
  totalVolume?: number;
  streakDays?: number;
  level?: number;
  rank?: string;
  totalMealDays?: number;
  totalSteps?: number;
  totalRecipeLogs?: number;
  leaderboardPosition?: number;
}): Promise<Badge[]> {
  const earned: Badge[] = [];

  async function tryAward(slug: string) {
    const badge = await awardBadge(userId, slug);
    if (badge) earned.push(badge);
  }

  const { totalWorkouts = 0, totalSets = 0, totalVolume = 0, streakDays = 0,
          level = 0, rank = 'E', totalMealDays = 0, totalSteps = 0,
          totalRecipeLogs = 0, leaderboardPosition } = context;

  if (totalWorkouts >= 1)   await tryAward('first_workout');
  if (totalWorkouts >= 10)  await tryAward('workouts_10');
  if (totalWorkouts >= 50)  await tryAward('workouts_50');
  if (totalWorkouts >= 100) await tryAward('workouts_100');
  if (totalSets >= 100)     await tryAward('sets_100');
  if (totalVolume >= 10000) await tryAward('volume_10k');
  if (streakDays >= 3)      await tryAward('streak_3');
  if (streakDays >= 7)      await tryAward('streak_7');
  if (streakDays >= 30)     await tryAward('streak_30');
  if (streakDays >= 100)    await tryAward('streak_100');
  if (totalMealDays >= 1)   await tryAward('first_meal');
  if (totalMealDays >= 7)   await tryAward('meals_7days');
  if (totalMealDays >= 30)  await tryAward('meals_30days');
  if (totalRecipeLogs >= 5) await tryAward('recipes_5');
  if (level >= 5)           await tryAward('level_5');
  if (level >= 10)          await tryAward('level_10');
  if (level >= 25)          await tryAward('level_25');
  if (totalSteps >= 10000)  await tryAward('steps_10k');
  if (totalSteps >= 50000)  await tryAward('steps_50k');

  const rankOrder = ['E', 'D', 'C', 'B', 'A', 'S'];
  const rankIdx = rankOrder.indexOf(rank);
  if (rankIdx >= 1) await tryAward('rank_d');
  if (rankIdx >= 2) await tryAward('rank_c');
  if (rankIdx >= 3) await tryAward('rank_b');
  if (rankIdx >= 4) await tryAward('rank_a');
  if (rankIdx >= 5) await tryAward('rank_s');

  if (leaderboardPosition !== undefined && leaderboardPosition <= 10) await tryAward('top_10');
  if (leaderboardPosition === 1) await tryAward('top_1');

  return earned;
}
