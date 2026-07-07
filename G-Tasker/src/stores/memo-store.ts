import { create } from 'zustand';
import { db } from '../db/database';
import type { Memo } from '../lib/types';

interface MemoStoreState {
  memos: Memo[];
  isLoading: boolean;
  loadMemos: () => Promise<void>;
  addMemo: (m: Omit<Memo, 'id'>) => Promise<number>;
  updateMemo: (id: number, patch: Partial<Memo>) => Promise<void>;
  deleteMemo: (id: number) => Promise<void>;
  togglePin: (id: number) => Promise<void>;
}

export const useMemoStore = create<MemoStoreState>((set, get) => ({
  memos: [],
  isLoading: true,

  loadMemos: async () => {
    set({ isLoading: true });
    const memos = await db.memos.toArray();
    // pinned first, then by updatedAt desc
    memos.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    set({ memos, isLoading: false });
  },

  addMemo: async (input) => {
    const id = await db.memos.add(input as Memo);
    await get().loadMemos();
    return id as number;
  },

  updateMemo: async (id, patch) => {
    await db.memos.update(id, { ...patch, updatedAt: new Date().toISOString() });
    await get().loadMemos();
  },

  deleteMemo: async (id) => {
    await db.memos.delete(id);
    set((s) => ({ memos: s.memos.filter((m) => m.id !== id) }));
  },

  togglePin: async (id) => {
    const m = get().memos.find((x) => x.id === id);
    if (!m) return;
    await db.memos.update(id, { pinned: !m.pinned, updatedAt: new Date().toISOString() });
    await get().loadMemos();
  },
}));
