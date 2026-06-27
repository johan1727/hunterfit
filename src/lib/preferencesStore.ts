import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DIET_CATEGORIES = [
  { key: 'carnes', label: 'Carnes', emoji: '🥩' },
  { key: 'pescado', label: 'Pescado', emoji: '🐟' },
  { key: 'lacteos', label: 'Lácteos', emoji: '🥛' },
  { key: 'huevos', label: 'Huevos', emoji: '🥚' },
  { key: 'cereales', label: 'Cereales', emoji: '🌾' },
  { key: 'legumbres', label: 'Legumbres', emoji: '🫘' },
  { key: 'verduras', label: 'Verduras', emoji: '🥦' },
  { key: 'frutas', label: 'Frutas', emoji: '🍎' },
  { key: 'frutos_secos', label: 'Frutos secos', emoji: '🥜' },
  { key: 'snacks', label: 'Snacks', emoji: '🍫' },
];

interface PreferencesStore {
  selectedCategories: string[];
  hasCompletedOnboarding: boolean;
  toggleCategory: (key: string) => void;
  setCategories: (keys: string[]) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      selectedCategories: [],
      hasCompletedOnboarding: false,
      toggleCategory: (key) =>
        set((s) => ({
          selectedCategories: s.selectedCategories.includes(key)
            ? s.selectedCategories.filter((k) => k !== key)
            : [...s.selectedCategories, key],
        })),
      setCategories: (keys) => set({ selectedCategories: keys }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      reset: () => set({ selectedCategories: [], hasCompletedOnboarding: false }),
    }),
    {
      name: 'hunterfit-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
