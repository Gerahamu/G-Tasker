import { create } from 'zustand';
import { db } from '../db/database';
import type { Plan, PlanBlock } from '../lib/types';

interface PlanStore {
  plans: Plan[];
  blocks: PlanBlock[];
  load: () => Promise<void>;
  addPlan: (p: Omit<Plan, 'id'>) => Promise<number>;
  updatePlan: (id: number, p: Partial<Plan>) => Promise<void>;
  deletePlan: (id: number) => Promise<void>;
  duplicatePlan: (id: number) => Promise<number>;
  addBlock: (b: Omit<PlanBlock, 'id'>) => Promise<number>;
  updateBlock: (id: number, b: Partial<PlanBlock>) => Promise<void>;
  deleteBlock: (id: number) => Promise<void>;
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  plans: [], blocks: [],

  load: async () => {
    const [plans, blocks] = await Promise.all([
      db.planTemplates.orderBy('createdAt').reverse().toArray(),
      db.planTemplateBlocks.orderBy('sortOrder').toArray(),
    ]);
    set({ plans, blocks });
  },

  addPlan: async (p) => {
    const id = await db.planTemplates.add(p as Plan);
    set(s => ({ plans: [{ ...p, id }, ...s.plans] }));
    return id as number;
  },
  updatePlan: async (id, p) => {
    await db.planTemplates.update(id, p);
    set(s => ({ plans: s.plans.map(x => x.id === id ? { ...x, ...p } : x) }));
  },
  deletePlan: async (id) => {
    await db.planTemplates.delete(id);
    await db.planTemplateBlocks.where('planId').equals(id).delete();
    set(s => ({ plans: s.plans.filter(x => x.id !== id), blocks: s.blocks.filter(x => x.planId !== id) }));
  },
  duplicatePlan: async (id) => {
    const plan = get().plans.find(x => x.id === id);
    if (!plan) return 0;
    const newId = await db.planTemplates.add({ ...plan, id: undefined, name: plan.name + ' (副本)', createdAt: new Date().toISOString() } as Plan);
    const oldBlocks = get().blocks.filter(x => x.planId === id);
    for (const b of oldBlocks) {
      await db.planTemplateBlocks.add({ ...b, id: undefined, planId: newId, createdAt: new Date().toISOString() } as PlanBlock);
    }
    await get().load();
    return newId as number;
  },

  addBlock: async (b) => {
    const id = await db.planTemplateBlocks.add(b as PlanBlock);
    set(s => ({ blocks: [...s.blocks, { ...b, id }] }));
    return id as number;
  },
  updateBlock: async (id, b) => {
    await db.planTemplateBlocks.update(id, b);
    set(s => ({ blocks: s.blocks.map(x => x.id === id ? { ...x, ...b } : x) }));
  },
  deleteBlock: async (id) => {
    await db.planTemplateBlocks.delete(id);
    set(s => ({ blocks: s.blocks.filter(x => x.id !== id) }));
  },
}));
