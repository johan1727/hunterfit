import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { localDateString } from '../lib/dates';
import type { Character, Exercise, Food, MealLog, Profile, Quest } from '../types/db';
import { getOrCreateDailyQuests } from '../services/quests';

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
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId!);
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

export function useDailyQuests(userId: string | null, level: number | undefined) {
  return useQuery({
    queryKey: ['quests', userId, localDateString()],
    enabled: !!userId && level != null,
    queryFn: (): Promise<Quest[]> => getOrCreateDailyQuests(userId!, level!),
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
  return useMutation({
    mutationFn: async (amount: number) => {
      const { data, error } = await supabase.rpc('grant_xp', { amount });
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}
