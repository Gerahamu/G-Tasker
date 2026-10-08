import { create } from 'zustand';
import { db } from '../db/database';
import type { Planning } from '../lib/types';

interface PlanStore {
  plannings: Planning[];
  load: () => Promise<void>;
  addPlanning: (p: Omit<Planning, 'id'>) => Promise<number>;
  updatePlanning: (id: number, p: Partial<Planning>) => Promise<void>;
  deletePlanning: (id: number) => Promise<void>;
}

export const usePlanStore = create<PlanStore>((set) => ({
  plannings: [],

  load: async () => {
    const plannings = await db.plannings.orderBy('createdAt').reverse().toArray();
    set({ plannings });
  },

  addPlanning: async (p) => {
    const id = await db.plannings.add(p as Planning);
    set((s) => ({ plannings: [{ ...p, id }, ...s.plannings] }));
    return id as number;
  },

  updatePlanning: async (id, p) => {
    await db.plannings.update(id, p);
    set((s) => ({
      plannings: s.plannings.map((x) => (x.id === id ? { ...x, ...p } : x)),
    }));
  },

  deletePlanning: async (id) => {
    await db.plannings.delete(id);
    set((s) => ({ plannings: s.plannings.filter((x) => x.id !== id) }));
  },
}));
