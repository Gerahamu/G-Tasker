import { create } from 'zustand';
import { db } from '../db/database';
import type { TaskList } from '../lib/types';

interface ListStoreState {
  lists: TaskList[];
  dirtyIds: Set<number>;
  isLoading: boolean;

  loadLists: () => Promise<void>;
  getList: (id: number) => TaskList | undefined;
  addList: (list: Omit<TaskList, 'id' | 'createdAt' | 'sortOrder'>) => Promise<number>;
  updateList: (id: number, patch: Partial<TaskList>) => void;
  deleteList: (id: number) => Promise<void>;
  saveDirtyLists: () => Promise<void>;
  getUserLists: () => TaskList[];
}

export const useListStore = create<ListStoreState>((set, get) => ({
  lists: [],
  dirtyIds: new Set<number>(),
  isLoading: true,

  loadLists: async () => {
    set({ isLoading: true });
    const lists = await db.taskLists.orderBy('sortOrder').toArray();
    set({ lists, isLoading: false });
  },

  getList: (id: number) => {
    return get().lists.find((l) => l.id === id);
  },

  addList: async (listInput) => {
    // ✅ 检查重名
    const duplicate = get().lists.find(
      (l) => l.name === listInput.name && !l.isSmartList
    );
    if (duplicate) return duplicate.id!;

    const now = new Date().toISOString();
    const maxOrder = get().lists.reduce(
      (max, l) => Math.max(max, l.sortOrder),
      0
    );
    const list = {
      ...listInput,
      sortOrder: maxOrder + 1,
      createdAt: now,
    } as TaskList;
    const id = await db.taskLists.add(list);
    set((s) => ({ lists: [...s.lists, { ...list, id }] }));
    return id as number;
  },

  updateList: (id: number, patch: Partial<TaskList>) => {
    set((s) => ({
      lists: s.lists.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      dirtyIds: new Set(s.dirtyIds).add(id),
    }));
  },

  deleteList: async (id: number) => {
    await db.taskLists.delete(id);
    await db.tasks.where('listId').equals(id).delete();
    set((s) => ({ lists: s.lists.filter((l) => l.id !== id) }));
  },

  saveDirtyLists: async () => {
    const { dirtyIds, lists } = get();
    if (dirtyIds.size === 0) return;
    const ops: Promise<unknown>[] = [];
    for (const id of dirtyIds) {
      const list = lists.find((l) => l.id === id);
      if (list) {
        ops.push(db.taskLists.put(list));
      }
    }
    await Promise.all(ops);
    set({ dirtyIds: new Set() });
  },

  getUserLists: () => {
    return get().lists.filter((l) => !l.isSmartList);
  },
}));
