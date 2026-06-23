import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateRecipeWithGemini, generateMultipleRecipes, type RecipeRequest, type GeneratedRecipe } from '../services/recipeAI';
import { supabase } from '../lib/supabase';
import type { Food } from '../types/db';

export function useRecipeAI(request: RecipeRequest, enabled: boolean = false) {
  const queryClient = useQueryClient();

  // Fetch foods once, cache for 1 hour
  const { data: foods } = useQuery({
    queryKey: ['foods-for-recipe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .limit(500); // Top 500 for speed
      if (error) throw error;
      return data as Food[] || [];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Generate single recipe mutation
  const generateRecipe = useMutation({
    mutationFn: async () => {
      if (!foods) throw new Error('Foods not loaded');
      return generateRecipeWithGemini(request, foods);
    },
    onSuccess: (recipe) => {
      queryClient.setQueryData(['recipes', request.mealType], recipe);
    },
  });

  // Generate multiple recipes mutation
  const generateMultiple = useMutation({
    mutationFn: async (count: number = 3) => {
      if (!foods) throw new Error('Foods not loaded');
      return generateMultipleRecipes(request, foods, count);
    },
    onSuccess: (recipes) => {
      queryClient.setQueryData(['recipes-multiple', request.mealType], recipes);
    },
  });

  return {
    generateRecipe: generateRecipe.mutate,
    generateMultiple: generateMultiple.mutate,
    isGenerating: generateRecipe.isPending || generateMultiple.isPending,
    error: generateRecipe.error || generateMultiple.error,
    recipe: generateRecipe.data,
    recipes: generateMultiple.data,
  };
}
