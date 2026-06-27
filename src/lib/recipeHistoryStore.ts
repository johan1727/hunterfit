import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GeneratedRecipe } from '../services/recipeAI';

interface RecipeHistoryStore {
  history: GeneratedRecipe[];
  addToHistory: (recipes: GeneratedRecipe[]) => void;
  clearHistory: () => void;
}

export const useRecipeHistoryStore = create<RecipeHistoryStore>()(
  persist(
    (set) => ({
      history: [],
      addToHistory: (recipes) =>
        set((s) => ({
          history: [...recipes, ...s.history].slice(0, 20),
        })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'hunterfit-recipe-history',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
