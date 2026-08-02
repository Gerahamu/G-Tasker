import { create } from 'zustand';
import { db } from '../db/database';
import type { Tag, TaskTag } from '../lib/types';

interface TagStoreState {
  tags: Tag[];
  taskTags: TaskTag[];
  dirtyTagIds: Set<number>;
  isLoading: boolean;

  loadTags: () => Promise<void>;
  loadTaskTags: () => Promise<void>;
  addTag: (name: string, color: string) => Promise<number>;
  deleteTag: (id: number) => Promise<void>;
  assignTag: (taskId: number, tagId: number) => Promise<void>;
  removeTag: (taskId: number, tagId: number) => Promise<void>;
  getTagsForTask: (taskId: number) => Tag[];
  saveDirtyTags: () => Promise<void>;
}

export const useTagStore = create<TagStoreState>((set, get) => ({
  tags: [],
  taskTags: [],
  dirtyTagIds: new Set<number>(),
  isLoading: true,

  loadTags: async () => {
    set({ isLoading: true });
    const tags = await db.tags.toArray();
    const taskTags = await db.taskTags.toArray();
    set({ tags, taskTags, isLoading: false });
  },

  loadTaskTags: async () => {
    const taskTags = await db.taskTags.toArray();
    set({ taskTags });
  },

  addTag: async (name: string, color: string) => {
    const existing = await db.tags.where('name').equals(name).first();
    if (existing) return existing.id!;
    const id = await db.tags.add({ name, color });
    set((s) => ({ tags: [...s.tags, { id, name, color }] }));
    return id as number;
  },

  deleteTag: async (id: number) => {
    await db.tags.delete(id);
    await db.taskTags.where('tagId').equals(id).delete();
    set((s) => ({
      tags: s.tags.filter((t) => t.id !== id),
      taskTags: s.taskTags.filter((tt) => tt.tagId !== id),
    }));
  },

  assignTag: async (taskId: number, tagId: number) => {
    const existing = await db.taskTags
      .where('[taskId+tagId]')
      .equals([taskId, tagId])
      .first();
    if (existing) return;
    const id = await db.taskTags.add({ taskId, tagId });
    set((s) => ({ taskTags: [...s.taskTags, { id, taskId, tagId }] }));
  },

  removeTag: async (taskId: number, tagId: number) => {
    await db.taskTags.where('[taskId+tagId]').equals([taskId, tagId]).delete();
    set((s) => ({
      taskTags: s.taskTags.filter(
        (tt) => !(tt.taskId === taskId && tt.tagId === tagId)
      ),
    }));
  },

  getTagsForTask: (taskId: number) => {
    const { tags, taskTags } = get();
    const tagIds = taskTags
      .filter((tt) => tt.taskId === taskId)
      .map((tt) => tt.tagId);
    return tags.filter((t) => tagIds.includes(t.id!));
  },

  saveDirtyTags: async () => {
    // Tags are saved directly on add/delete, so dirty tracking is minimal
    set({ dirtyTagIds: new Set() });
  },
}));
