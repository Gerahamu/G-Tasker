import { db } from './database';
import type { Tag, TaskTag } from '../lib/types';

export interface TaskTagSnapshot {
  tags: Tag[];
  relations: TaskTag[];
}

export async function loadTaskTagSnapshot(taskIds: readonly number[]): Promise<TaskTagSnapshot> {
  const ids = [...new Set(taskIds.filter(Number.isFinite))];
  const [tags, relations] = await Promise.all([
    db.tags.toArray(),
    ids.length ? db.taskTags.where('taskId').anyOf(ids).toArray() : Promise.resolve([]),
  ]);
  return { tags, relations };
}

/** Toggle a tag as a group: partial selection fills the missing relations. */
export async function toggleTagForTasks(taskIds: readonly number[], tagId: number) {
  const ids = [...new Set(taskIds.filter(Number.isFinite))];
  if (ids.length === 0) return 'unchanged' as const;

  return db.transaction('rw', db.taskTags, async () => {
    const selectedIds = new Set(ids);
    const current = await db.taskTags
      .where('tagId')
      .equals(tagId)
      .and((relation) => selectedIds.has(relation.taskId))
      .toArray();
    const currentTaskIds = new Set(current.map((relation) => relation.taskId));
    const hasEveryTask = ids.every((id) => currentTaskIds.has(id));

    if (hasEveryTask) {
      await db.taskTags.bulkDelete(current.map((relation) => relation.id!));
      return 'removed' as const;
    }

    await db.taskTags.bulkAdd(
      ids.filter((id) => !currentTaskIds.has(id)).map((taskId) => ({ taskId, tagId })),
    );
    return 'added' as const;
  });
}

export async function createTagForTasks(taskIds: readonly number[], rawName: string) {
  const name = rawName.trim();
  if (!name) throw new Error('Tag name cannot be empty');
  const ids = [...new Set(taskIds.filter(Number.isFinite))];

  return db.transaction('rw', [db.tags, db.taskTags], async () => {
    const existing = await db.tags.where('name').equals(name).first();
    const resolvedTagId = existing?.id ?? (await db.tags.add({ name, color: '#a1a1aa' }));
    if (resolvedTagId === undefined) throw new Error('Tag could not be created');
    if (ids.length) {
      const selectedIds = new Set(ids);
      const current = await db.taskTags
        .where('tagId')
        .equals(resolvedTagId)
        .and((relation) => selectedIds.has(relation.taskId))
        .toArray();
      const currentTaskIds = new Set(current.map((relation) => relation.taskId));
      await db.taskTags.bulkAdd(
        ids
          .filter((id) => !currentTaskIds.has(id))
          .map((taskId) => ({ taskId, tagId: resolvedTagId })),
      );
    }
    return resolvedTagId;
  });
}

export async function renameTaskTag(tagId: number, rawName: string) {
  const name = rawName.trim();
  if (!name) throw new Error('Tag name cannot be empty');
  return db.tags.update(tagId, { name });
}

/** Removing a tag only removes its assignments and tag record, never tasks. */
export async function deleteTaskTag(tagId: number) {
  return db.transaction('rw', [db.tags, db.taskTags], async () => {
    await db.taskTags.where('tagId').equals(tagId).delete();
    await db.tags.delete(tagId);
  });
}
