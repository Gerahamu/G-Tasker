import { create } from 'zustand';
import { db } from '../db/database';
import { isOverdue, todayISO } from '../lib/format-date';
import type { Task } from '../lib/types';
import { acknowledgeSaved, createDirtySaver } from '../lib/dirty-save';
import {
  createTaskRecord,
  deleteTasksCascade,
  taskCascadeTables,
  type NewTaskInput,
  type TaskCreationRelations,
  createNextRecurringTask,
} from '../db/task-operations';
import { reorderTasks as persistTaskOrder } from '../db/task-ordering';

const saveTasks: () => Promise<void> = createDirtySaver<Task>({
  snapshot: () => ({
    records: useTaskStore.getState().tasks,
    dirtyIds: useTaskStore.getState().dirtyIds,
  }),
  persist: (records) =>
    db.transaction('rw', db.tasks, async () => {
      // Update never recreates a task deleted while a save was queued.
      for (const record of records) await db.tasks.update(record.id!, record);
    }),
  acknowledge: (records) =>
    useTaskStore.setState((state) => ({
      dirtyIds: acknowledgeSaved(state.dirtyIds, state.tasks, records),
    })),
});

interface TaskStoreState {
  tasks: Task[];
  dirtyIds: Set<number>;
  isLoading: boolean;
  hasLoadedAll: boolean;

  loadTasksByList: (listId: number) => Promise<void>;
  loadAllTasks: () => Promise<void>;
  loadTasksByIds: (ids: number[]) => Promise<Task[]>;
  getTask: (id: number) => Task | undefined;
  addTask: (task: NewTaskInput, relations?: TaskCreationRelations) => Promise<number>;
  updateTask: (id: number, patch: Partial<Task>) => void;
  deleteTask: (id: number) => Promise<void>;
  deleteTasks: (ids: number[]) => Promise<void>;
  completeTask: (id: number) => void;
  setTaskCompleted: (id: number, completed: boolean) => void;
  persistTaskCompletion: (id: number, completed: boolean) => Promise<void>;
  createNextRecurringOccurrence: (id: number) => Promise<number | null>;
  revertTaskCompletion: (id: number, nextOccurrenceId?: number | null) => Promise<void>;
  reorderTasks: (orderedIds: number[]) => Promise<void>;
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
  hasLoadedAll: false,

  loadTasksByList: async (listId: number) => {
    set({ isLoading: true });
    const tasks = await db.tasks.where('listId').equals(listId).sortBy('sortOrder');
    set((state) => ({
      tasks: tasks.map((task) =>
        state.dirtyIds.has(task.id!)
          ? (state.tasks.find((current) => current.id === task.id) ?? task)
          : task,
      ),
      isLoading: false,
    }));
  },

  loadAllTasks: async () => {
    if (get().hasLoadedAll) return;
    set({ isLoading: true });
    const tasks = await db.tasks.orderBy('sortOrder').toArray();
    set((state) => ({
      tasks: tasks.map((task) =>
        state.dirtyIds.has(task.id!)
          ? (state.tasks.find((current) => current.id === task.id) ?? task)
          : task,
      ),
      isLoading: false,
      hasLoadedAll: true,
    }));
  },

  loadTasksByIds: async (ids: number[]) => {
    return await db.tasks
      .bulkGet(ids)
      .then((tasks) => tasks.filter((t): t is Task => t !== undefined));
  },

  getTask: (id: number) => {
    return get().tasks.find((t) => t.id === id);
  },

  addTask: async (taskInput, relations) => {
    const { id, task } = await createTaskRecord(taskInput, relations);
    set((state) => ({
      tasks: state.tasks.some((current) => current.id === id) ? state.tasks : [...state.tasks, task],
    }));
    return id;
  },

  updateTask: (id: number, patch: Partial<Task>) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
      ),
      dirtyIds: new Set(s.dirtyIds).add(id),
    }));
  },

  deleteTask: async (id: number) => get().deleteTasks([id]),

  deleteTasks: async (ids: number[]) => {
    const deletedIds = await db.transaction('rw', taskCascadeTables, () => deleteTasksCascade(ids));
    const deleted = new Set(deletedIds);
    set((s) => {
      const dirtyIds = new Set(s.dirtyIds);
      for (const deletedId of deleted) dirtyIds.delete(deletedId);
      return { tasks: s.tasks.filter((task) => !deleted.has(task.id!)), dirtyIds };
    });
  },

  completeTask: (id: number) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    get().setTaskCompleted(id, !task.completedAt);
  },

  setTaskCompleted: (id: number, completed: boolean) => {
    const task = get().tasks.find((candidate) => candidate.id === id);
    if (!task || Boolean(task.completedAt) === completed) return;
    const completedAt = completed ? new Date().toISOString() : null;
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, completedAt, updatedAt: new Date().toISOString() } : t,
      ),
      dirtyIds: new Set(s.dirtyIds).add(id),
    }));
  },

  persistTaskCompletion: async (id: number, completed: boolean) => {
    const task = get().tasks.find((candidate) => candidate.id === id);
    if (!task || Boolean(task.completedAt) === completed) return;
    const completedAt = completed ? new Date().toISOString() : null;
    const updatedAt = new Date().toISOString();
    await db.tasks.update(id, { completedAt, updatedAt });
    set((state) => {
      const dirtyIds = new Set(state.dirtyIds);
      dirtyIds.delete(id);
      return {
        tasks: state.tasks.map((current) =>
          current.id === id ? { ...current, completedAt, updatedAt } : current,
        ),
        dirtyIds,
      };
    });
  },

  createNextRecurringOccurrence: async (id: number) => {
    const task = get().tasks.find((candidate) => candidate.id === id);
    if (!task?.completedAt || !task.repeatRule) return null;
    const result = await createNextRecurringTask(task);
    if (!result) return null;
    set((state) => ({
      tasks: state.tasks
        .map((current) =>
          current.id === result.sourceId
            ? { ...current, recurrenceRuleId: result.recurrenceRuleId }
            : current,
        )
        .concat(state.tasks.some((current) => current.id === result.task.id) ? [] : [result.task]),
    }));
    return result.task.id ?? null;
  },

  revertTaskCompletion: async (id: number, nextOccurrenceId?: number | null) => {
    if (nextOccurrenceId == null) {
      await get().persistTaskCompletion(id, false);
      return;
    }

    const updatedAt = new Date().toISOString();
    const deletedIds = await db.transaction('rw', taskCascadeTables, async () => {
      await db.tasks.update(id, { completedAt: null, updatedAt });
      return deleteTasksCascade([nextOccurrenceId]);
    });
    const deleted = new Set(deletedIds);
    set((state) => {
      const dirtyIds = new Set(state.dirtyIds);
      for (const deletedId of deleted) dirtyIds.delete(deletedId);
      return {
        tasks: state.tasks
          .filter((task) => !deleted.has(task.id!))
          .map((task) => (task.id === id ? { ...task, completedAt: null, updatedAt } : task)),
        dirtyIds,
      };
    });
  },

  reorderTasks: async (orderedIds: number[]) => {
    const updates = await persistTaskOrder(orderedIds);
    if (updates.length === 0) return;
    const byId = new Map(updates.map((update) => [update.id, update.sortOrder]));
    set((state) => ({
      tasks: state.tasks.map((task) => {
        const sortOrder = task.id === undefined ? undefined : byId.get(task.id);
        return sortOrder === undefined ? task : { ...task, sortOrder };
      }),
    }));
  },

  saveDirtyTasks: saveTasks,

  getTodayTasks: () => {
    const today = todayISO();
    return get().tasks.filter((t) => !t.completedAt && t.dueDate === today);
  },

  getScheduledTasks: () => {
    return get().tasks.filter((t) => !t.completedAt && t.dueDate !== null);
  },

  getFlaggedTasks: () => {
    return get().tasks.filter((t) => !t.completedAt && t.isFlagged);
  },

  getOverdueTasks: () => {
    return get().tasks.filter((t) => !t.completedAt && isOverdue(t.dueDate, t.dueTime));
  },

  getAllIncompleteTasks: () => {
    return get().tasks.filter((t) => !t.completedAt);
  },

  searchTasks: (query: string) => {
    const lower = query.toLowerCase();
    return get().tasks.filter(
      (t) => t.title.toLowerCase().includes(lower) || t.notes.toLowerCase().includes(lower),
    );
  },
}));
