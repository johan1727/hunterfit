import { create } from 'zustand';

type LevelUpStore = {
  pendingLevel: number | null;
  showLevelUp: (level: number) => void;
  dismissLevelUp: () => void;
};

export const useLevelUpStore = create<LevelUpStore>((set) => ({
  pendingLevel: null,
  showLevelUp: (level) => set({ pendingLevel: level }),
  dismissLevelUp: () => set({ pendingLevel: null }),
}));
