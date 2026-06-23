import { create } from 'zustand';
import type { GeneratedRecipe } from '../services/recipeAI';

interface FavoriteRecipesStore {
  favorites: GeneratedRecipe[];
  addFavorite: (recipe: GeneratedRecipe) => void;
  removeFavorite: (recipeId: string) => void;
  isFavorited: (recipeId: string) => boolean;
  getFavorites: () => GeneratedRecipe[];
}

export const useFavoriteRecipes = create<FavoriteRecipesStore>((set, get) => ({
  favorites: [],

  addFavorite: (recipe) => set((state) => {
    // Avoid duplicates
    if (state.favorites.some(r => r.id === recipe.id)) return state;
    return { favorites: [...state.favorites, recipe] };
  }),

  removeFavorite: (recipeId) => set((state) => ({
    favorites: state.favorites.filter(r => r.id !== recipeId),
  })),

  isFavorited: (recipeId) => {
    const { favorites } = get();
    return favorites.some(r => r.id === recipeId);
  },

  getFavorites: () => {
    const { favorites } = get();
    return [...favorites];
  },
}));
