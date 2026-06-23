import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { localDateString } from '../lib/dates';
import type { Character, Exercise, Food, MealLog, Profile, Quest } from '../types/db';
import { getOrCreateDailyQuests, getOrCreateWeeklyQuests } from '../services/quests';
import { useLevelUpStore } from '../lib/levelUpStore';

export function useProfile(userId: string | null) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

export function useUpdateProfile(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      // upsert: crea la fila si no existe (usuarios nuevos de Google/OAuth)
      const { error } = await supabase.from('profiles').upsert({ id: userId!, ...patch });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}

export function useCharacters() {
  return useQuery({
    queryKey: ['characters'],
    staleTime: Infinity,
    queryFn: async (): Promise<Character[]> => {
      const { data, error } = await supabase.from('characters').select('*').order('id');
      if (error) throw error;
      return data as Character[];
    },
  });
}

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    staleTime: Infinity,
    queryFn: async (): Promise<Exercise[]> => {
      const { data, error } = await supabase.from('exercises').select('*');
      if (error) throw error;
      return data as Exercise[];
    },
  });
}

export function useFoodSearch(term: string) {
  return useQuery({
    queryKey: ['foods', term],
    enabled: term.trim().length >= 2,
    queryFn: async (): Promise<Food[]> => {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .ilike('name_es', `%${term.trim()}%`)
        .limit(25);
      if (error) throw error;
      return data as Food[];
    },
  });
}

export function useDefaultFoods() {
  return useQuery({
    queryKey: ['foods-default'],
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<Food[]> => {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .order('category')
        .limit(50);
      if (error) throw error;
      return data as Food[];
    },
  });
}

export function useDailyQuests(userId: string | null, level: number | undefined) {
  return useQuery({
    queryKey: ['quests', userId, localDateString()],
    enabled: !!userId && level != null,
    queryFn: (): Promise<Quest[]> => getOrCreateDailyQuests(userId!, level!),
  });
}

export function useWeeklyQuests(userId: string | null, level: number | undefined) {
  const weekStart = (() => {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  })();
  return useQuery({
    queryKey: ['weekly_quests', userId, weekStart],
    enabled: !!userId && level != null,
    queryFn: (): Promise<Quest[]> => getOrCreateWeeklyQuests(userId!, level!),
  });
}

export function useMealLogs(userId: string | null, date: string) {
  return useQuery({
    queryKey: ['meals', userId, date],
    enabled: !!userId,
    queryFn: async (): Promise<MealLog[]> => {
      const { data, error } = await supabase
        .from('meal_logs').select('*').eq('user_id', userId!).eq('date', date)
        .order('created_at');
      if (error) throw error;
      return data as MealLog[];
    },
  });
}

export function useGrantXp(userId: string | null) {
  const qc = useQueryClient();
  const showLevelUp = useLevelUpStore((s) => s.showLevelUp);
  return useMutation({
    mutationFn: async (amount: number) => {
      const prevProfile = qc.getQueryData<Profile>(['profile', userId]);
      const { data, error } = await supabase.rpc('grant_xp', { amount });
      if (error) throw error;
      const updated = data as Profile;
      if (prevProfile && updated.level > prevProfile.level) {
        showLevelUp(updated.level);
      }
      return updated;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}

// ── Streak ───────────────────────────────────────────────────────────────────

export function useUpdateStreak(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('update_streak');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}

// ── Water ────────────────────────────────────────────────────────────────────

export function useWaterToday(userId: string | null, date: string) {
  return useQuery({
    queryKey: ['water', userId, date],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_logs').select('ml').eq('user_id', userId!).eq('date', date);
      if (error) throw error;
      return (data ?? []).reduce((s: number, r: { ml: number }) => s + r.ml, 0);
    },
  });
}

export function useAddWater(userId: string | null, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ml: number) => {
      const { error } = await supabase
        .from('water_logs').insert({ user_id: userId!, date, ml });
      if (error) throw error;
      // Actualizar racha al registrar agua
      await supabase.rpc('update_streak');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['water', userId, date] });
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}

// ── Weight ───────────────────────────────────────────────────────────────────

export type WeightEntry = { date: string; weight_kg: number };

export function useWeightHistory(userId: string | null) {
  return useQuery({
    queryKey: ['weight', userId],
    enabled: !!userId,
    queryFn: async (): Promise<WeightEntry[]> => {
      const { data, error } = await supabase
        .from('weight_logs').select('date, weight_kg')
        .eq('user_id', userId!).order('date', { ascending: true }).limit(30);
      if (error) throw error;
      return data as WeightEntry[];
    },
  });
}

export function useLogWeight(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weight_kg: number) => {
      const date = localDateString();
      const { error } = await supabase.from('weight_logs')
        .upsert({ user_id: userId!, date, weight_kg }, { onConflict: 'user_id,date' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weight', userId] }),
  });
}

// ── Favorites ────────────────────────────────────────────────────────────────

export type FavoriteMeal = {
  id: string; name: string;
  kcal: number; protein_g: number; carbs_g: number; fat_g: number;
  food_id?: number | null;
};

export function useFavorites(userId: string | null) {
  return useQuery({
    queryKey: ['favorites', userId],
    enabled: !!userId,
    queryFn: async (): Promise<FavoriteMeal[]> => {
      const { data, error } = await supabase
        .from('favorite_meals').select('*').eq('user_id', userId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data as FavoriteMeal[];
    },
  });
}

export function useAddFavorite(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (meal: Omit<FavoriteMeal, 'id'>) => {
      const { error } = await supabase.from('favorite_meals').insert({ user_id: userId!, ...meal });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites', userId] }),
  });
}

export function useRemoveFavorite(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('favorite_meals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites', userId] }),
  });
}

// ── Weekly calories chart ────────────────────────────────────────────────────

export type DayNutrition = { date: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number };

export function useWeeklyCalories(userId: string | null) {
  return useQuery({
    queryKey: ['weekly_kcal', userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DayNutrition[]> => {
      const days: DayNutrition[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push({ date: d.toISOString().split('T')[0], kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
      }
      const start = days[0].date;
      const { data, error } = await supabase
        .from('meal_logs')
        .select('date, kcal, protein_g, carbs_g, fat_g')
        .eq('user_id', userId!)
        .gte('date', start);
      if (error) throw error;
      for (const row of data ?? []) {
        const day = days.find((d) => d.date === row.date);
        if (day) {
          day.kcal     += +row.kcal;
          day.protein_g += +row.protein_g;
          day.carbs_g   += +row.carbs_g;
          day.fat_g     += +row.fat_g;
        }
      }
      return days;
    },
  });
}

// ── Copy yesterday ────────────────────────────────────────────────────────────

export function useCopyYesterday(userId: string | null, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const yDate = yesterday.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('meal_logs').select('*').eq('user_id', userId!).eq('date', yDate);
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No hay comidas de ayer');
      const inserts = data.map(({ id: _id, created_at: _c, date: _d, ...rest }: any) => ({
        ...rest, date, user_id: userId!,
      }));
      const { error: insErr } = await supabase.from('meal_logs').insert(inserts);
      if (insErr) throw insErr;
      return inserts.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals', userId, date] }),
  });
}
