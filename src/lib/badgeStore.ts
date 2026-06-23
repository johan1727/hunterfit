import { create } from 'zustand';
import type { Badge } from '../services/badges';

interface BadgeStore {
  queue: Badge[];
  enqueue: (badge: Badge) => void;
  dequeue: () => void;
}

export const useBadgeStore = create<BadgeStore>((set) => ({
  queue: [],
  enqueue: (badge) => set((s) => ({ queue: [...s.queue, badge] })),
  dequeue: () => set((s) => ({ queue: s.queue.slice(1) })),
}));
