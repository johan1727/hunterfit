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

export function useFoodSearch(term: string, category?: string) {
  return useQuery({
    queryKey: ['foods', term, category],
    enabled: term.trim().length >= 2,
    queryFn: async (): Promise<Food[]> => {
      let q = supabase.from('foods').select('*').ilike('name_es', `%${term.trim()}%`);
      if (category && category !== 'all') q = q.eq('category', category);
      const { data, error } = await q.limit(25);
      if (error) throw error;
      return data as Food[];
    },
  });
}

export function useDefaultFoods(category?: string) {
  return useQuery({
    queryKey: ['foods-default', category],
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<Food[]> => {
      let q = supabase.from('foods').select('*');
      if (category && category !== 'all') q = q.eq('category', category);
      // Más resultados al filtrar por categoría para que las subcategorías tengan datos
      const limit = category && category !== 'all' ? 150 : 50;
      // Con categoría: alfabético dentro de la subcategoría.
      // Sin categoría: por id (los primeros seed son los más comunes) para evitar
      // amontonar todos los "Aceite de…" al inicio.
      q = (category && category !== 'all')
        ? q.order('name_es')
        : q.order('id', { ascending: true });
      const { data, error } = await q.limit(limit);
      if (error) throw error;
      return data as Food[];
    },
  });
}

export function useWeekWorkouts(userId: string | null) {
  return useQuery({
    queryKey: ['week-workouts', userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<number> => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('completed_at')
        .eq('user_id', userId!)
        .gte('completed_at', weekAgo.toISOString());
      if (error) throw error;
      // Días únicos con al menos una sesión completada en los últimos 7 días
      const days = new Set(
        (data ?? [])
          .map((r: any) => r.completed_at)
          .filter(Boolean)
          .map((ts: string) => ts.split('T')[0])
      );
      return days.size;
    },
  });
}

export function useRecentFoods(userId: string | null) {
  return useQuery({
    queryKey: ['recent-foods', userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Food[]> => {
      const { data: logs, error } = await supabase
        .from('meal_logs')
        .select('food_id, created_at')
        .eq('user_id', userId!)
        .not('food_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      // IDs únicos preservando orden (más reciente primero)
      const seen = new Set<number>();
      const ids: number[] = [];
      for (const l of logs ?? []) {
        if (l.food_id != null && !seen.has(l.food_id)) {
          seen.add(l.food_id);
          ids.push(l.food_id);
        }
        if (ids.length >= 8) break;
      }
      if (ids.length === 0) return [];
      const { data: foods, error: e2 } = await supabase
        .from('foods').select('*').in('id', ids);
      if (e2) throw e2;
      // Reordenar según el orden de ids (recientes primero)
      const byId = new Map((foods ?? []).map((f: any) => [f.id, f]));
      return ids.map((id) => byId.get(id)).filter(Boolean) as Food[];
    },
  });
}

export function useFoodCategories() {
  return useQuery({
    queryKey: ['food-categories'],
    staleTime: Infinity,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from('foods').select('category').limit(1000);
      if (error) throw error;
      const unique = [...new Set((data ?? []).map((r: any) => r.category).filter(Boolean))].sort();
      return unique as string[];
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

// ── Body Measurements ────────────────────────────────────────────────────────

export interface BodyMeasurement {
  id: string;
  taken_at: string;
  weight_kg: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  body_fat_pct: number | null;
  notes: string | null;
}

export function useBodyMeasurements(userId: string | null) {
  return useQuery({
    queryKey: ['body-measurements', userId],
    enabled: !!userId,
    queryFn: async (): Promise<BodyMeasurement[]> => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', userId!)
        .order('taken_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as BodyMeasurement[];
    },
  });
}

export function useAddBodyMeasurement(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (m: Omit<BodyMeasurement, 'id'>) => {
      const { error } = await supabase
        .from('body_measurements')
        .insert({ ...m, user_id: userId! });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['body-measurements', userId] }),
  });
}

// ── Intermittent Fasting ─────────────────────────────────────────────────────

export interface FastingLog {
  id: string;
  started_at: string;
  ended_at: string | null;
  target_hours: number;
  completed: boolean;
}

export function useActiveFasting(userId: string | null) {
  return useQuery({
    queryKey: ['active-fasting', userId],
    enabled: !!userId,
    refetchInterval: 30_000, // refresh every 30s to keep timer in sync
    queryFn: async (): Promise<FastingLog | null> => {
      const { data, error } = await supabase
        .from('fasting_logs')
        .select('*')
        .eq('user_id', userId!)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as FastingLog | null;
    },
  });
}

export function useStartFasting(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetHours: number) => {
      const { error } = await supabase.from('fasting_logs').insert({
        user_id: userId!,
        target_hours: targetHours,
        started_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-fasting', userId] });
      queryClient.invalidateQueries({ queryKey: ['fasting-streak', userId] });
    },
  });
}

export function useStopFasting(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('fasting_logs')
        .update({ ended_at: new Date().toISOString(), completed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-fasting', userId] });
      queryClient.invalidateQueries({ queryKey: ['fasting-streak', userId] });
    },
  });
}

export function useFastingStreak(userId: string | null) {
  return useQuery({
    queryKey: ['fasting-streak', userId],
    enabled: !!userId,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('fasting_logs')
        .select('completed, ended_at')
        .eq('user_id', userId!)
        .eq('completed', true)
        .not('ended_at', 'is', null)
        .order('ended_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      // Count consecutive days with a completed fast
      const days = new Set(
        (data ?? []).map((r: any) => (r.ended_at as string).split('T')[0])
      );
      const arr = [...days].sort().reverse();
      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      for (let i = 0; i < arr.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);
        if (arr[i] === expected.toISOString().split('T')[0]) streak++;
        else break;
      }
      return streak;
    },
  });
}
