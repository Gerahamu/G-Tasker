import { create } from 'zustand';
import { db } from '../db/database';
import { isOverdue } from '../lib/format-date';
import type { Task } from '../lib/types';

interface TaskStoreState {
  tasks: Task[];
  dirtyIds: Set<number>;
  isLoading: boolean;

  loadTasksByList: (listId: number) => Promise<void>;
  loadAllTasks: () => Promise<void>;
  loadTasksByIds: (ids: number[]) => Promise<Task[]>;
  getTask: (id: number) => Task | undefined;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>;
  updateTask: (id: number, patch: Partial<Task>) => void;
  deleteTask: (id: number) => Promise<void>;
  completeTask: (id: number) => void;
  saveDirtyTasks: () => Promise<void>;

  // Query helpers for smart lists
  getTodayTasks: () => Task[];
  getScheduledTasks: () => Task[];
  getFlaggedTasks: () => Task[];
  getOverdueTasks: () => Task[];
  getAllIncompleteTasks: () => Task[];

  // Search
  searchTasks: (query: string) => Task[];
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],
  dirtyIds: new Set<number>(),
  isLoading: true,

  loadTasksByList: async (listId: number) => {
    set({ isLoading: true });
    const tasks = await db.tasks
      .where('listId')
      .equals(listId)
      .sortBy('sortOrder');
    set({ tasks, isLoading: false });
  },

  loadAllTasks: async () => {
    set({ isLoading: true });
    const tasks = await db.tasks.orderBy('sortOrder').toArray();
    set({ tasks, isLoading: false });
  },

  loadTasksByIds: async (ids: number[]) => {
    return await db.tasks.bulkGet(ids).then((tasks) =>
      tasks.filter((t): t is Task => t !== undefined)
    );
  },

  getTask: (id: number) => {
    return get().tasks.find((t) => t.id === id);
  },

  addTask: async (taskInput) => {
    const now = new Date().toISOString();
    const maxOrder = get().tasks
      .filter((t) => t.listId === taskInput.listId)
      .reduce((max, t) => Math.max(max, t.sortOrder), 0);
    const task = {
      ...taskInput,
      createdAt: now,
      updatedAt: now,
      sortOrder: maxOrder + 1,
      // ✅ 不覆盖 dateStart/dateEnd/dateMode，保留调用方传入的值
      dateTarget: taskInput.dateTarget ?? null,
      status: taskInput.status ?? 'active',
      milestones: taskInput.milestones ?? '[]',
    } as Task;
    const id = await db.tasks.add(task);
    set((s) => ({ tasks: [...s.tasks, { ...task, id }] }));
    return id as number;
  },

  updateTask: (id: number, patch: Partial<Task>) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
      ),
      dirtyIds: new Set(s.dirtyIds).add(id),
    }));
  },

  deleteTask: async (id: number) => {
    await db.tasks.delete(id);
    await db.subtasks.where('taskId').equals(id).delete();
    await db.taskTags.where('taskId').equals(id).delete();
    await db.taskDependencies.where('taskId').equals(id).or('dependsOnTaskId').equals(id).delete();
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  completeTask: (id: number) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const completedAt = task.completedAt ? null : new Date().toISOString();
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, completedAt, updatedAt: new Date().toISOString() } : t
      ),
      dirtyIds: new Set(s.dirtyIds).add(id),
    }));
  },

  saveDirtyTasks: async () => {
    const { dirtyIds, tasks } = get();
    if (dirtyIds.size === 0) return;
    const ops: Promise<unknown>[] = [];
    for (const id of dirtyIds) {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        ops.push(db.tasks.put(task));
      }
    }
    await Promise.all(ops);
    set({ dirtyIds: new Set() });
  },

  getTodayTasks: () => {
    const today = new Date().toISOString().slice(0, 10);
    return get().tasks.filter(
      (t) => !t.completedAt && t.dueDate === today
    );
  },

  getScheduledTasks: () => {
    return get().tasks.filter(
      (t) => !t.completedAt && t.dueDate !== null
    );
  },

  getFlaggedTasks: () => {
    return get().tasks.filter((t) => !t.completedAt && t.isFlagged);
  },

  getOverdueTasks: () => {
    return get().tasks.filter(
      (t) => !t.completedAt && isOverdue(t.dueDate, t.dueTime)
    );
  },

  getAllIncompleteTasks: () => {
    return get().tasks.filter((t) => !t.completedAt);
  },

  searchTasks: (query: string) => {
    const lower = query.toLowerCase();
    return get().tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.notes.toLowerCase().includes(lower)
    );
  },
}));
