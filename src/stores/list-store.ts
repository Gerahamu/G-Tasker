import { create } from 'zustand';
import { db } from '../db/database';
import type { TaskList } from '../lib/types';
import { acknowledgeSaved, createDirtySaver } from '../lib/dirty-save';
import { deleteTasksCascade, taskCascadeTables } from '../db/task-operations';
import { useTaskStore } from './task-store';

const saveLists: () => Promise<void> = createDirtySaver<TaskList>({
  snapshot: () => ({ records: useListStore.getState().lists, dirtyIds: useListStore.getState().dirtyIds }),
  persist: records => db.transaction('rw', db.taskLists, async () => {
    for (const record of records) await db.taskLists.update(record.id!, record);
  }),
  acknowledge: records => useListStore.setState(state => ({
    dirtyIds: acknowledgeSaved(state.dirtyIds, state.lists, records),
  })),
});

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
    set(state => ({ lists: lists.map(list => state.dirtyIds.has(list.id!)
      ? state.lists.find(current => current.id === list.id) ?? list : list), isLoading: false }));
  },

  getList: (id: number) => {
    return get().lists.find((l) => l.id === id);
  },

  addList: async (listInput) => {
    const list = await db.transaction('rw', db.taskLists, async () => {
      const existing = await db.taskLists
        .filter((candidate) => candidate.name === listInput.name && !candidate.isSmartList)
        .first();
      if (existing) return existing;
      const lists = await db.taskLists.toArray();
      const maxOrder = lists.reduce((max, candidate) => Math.max(max, candidate.sortOrder), 0);
      const created = {
        ...listInput,
        sortOrder: maxOrder + 1,
        createdAt: new Date().toISOString(),
      } as TaskList;
      const id = (await db.taskLists.add(created)) as number;
      return { ...created, id };
    });
    set((state) => ({
      lists: state.lists.some((candidate) => candidate.id === list.id)
        ? state.lists
        : [...state.lists, list],
    }));
    return list.id!;
  },

  updateList: (id: number, patch: Partial<TaskList>) => {
    set((s) => ({
      lists: s.lists.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      dirtyIds: new Set(s.dirtyIds).add(id),
    }));
  },

  deleteList: async (id: number) => {
    const deletedIds = await db.transaction('rw', [db.taskLists, ...taskCascadeTables], async () => {
      const taskIds = (await db.tasks.where('listId').equals(id).primaryKeys()).filter(
        (taskId): taskId is number => typeof taskId === 'number',
      );
      const removed = await deleteTasksCascade(taskIds);
      await db.taskLists.delete(id);
      return removed;
    });
    const deleted = new Set(deletedIds);
    set((s) => {
      const dirtyIds = new Set(s.dirtyIds);
      dirtyIds.delete(id);
      return { lists: s.lists.filter((l) => l.id !== id), dirtyIds };
    });
    useTaskStore.setState((state) => {
      const dirtyIds = new Set(state.dirtyIds);
      for (const taskId of deleted) dirtyIds.delete(taskId);
      return { tasks: state.tasks.filter((task) => !deleted.has(task.id!)), dirtyIds };
    });
  },

  saveDirtyLists: saveLists,

  getUserLists: () => {
    return get().lists.filter((l) => !l.isSmartList);
  },
}));
