import { create } from 'zustand';

interface DemoStore {
  isDemo: boolean;
  enterDemo: () => void;
  exitDemo: () => void;
}

export const useDemoStore = create<DemoStore>((set) => ({
  isDemo: false,
  enterDemo: () => set({ isDemo: true }),
  exitDemo: () => set({ isDemo: false }),
}));
