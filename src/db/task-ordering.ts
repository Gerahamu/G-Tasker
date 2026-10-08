import { db } from './database';

export interface SortOrderUpdate {
  id: number;
  sortOrder: number;
}

function assertUniqueIds(ids: readonly number[]): void {
  if (new Set(ids).size !== ids.length) throw new Error('Reorder IDs must be unique');
}

export async function reorderTasks(orderedIds: readonly number[]): Promise<SortOrderUpdate[]> {
  if (orderedIds.length < 2) return [];
  assertUniqueIds(orderedIds);

  return db.transaction('rw', db.tasks, async () => {
    const records = await db.tasks.bulkGet([...orderedIds]);
    if (records.some((record) => !record)) throw new Error('Every reordered task must exist');
    const tasks = records.filter((record) => record !== undefined);
    const listId = tasks[0].listId;
    if (tasks.some((task) => task.listId !== listId)) {
      throw new Error('Reordered tasks must belong to the same list');
    }
    if (tasks.some((task) => Boolean(task.completedAt))) {
      throw new Error('Completed tasks cannot be manually reordered');
    }

    // Reuse only the dragged unfinished records' existing slots. A completed
    // record therefore keeps its manual-position slot for a future undo.
    const slots = tasks.map((task) => task.sortOrder).sort((a, b) => a - b);
    const updates = orderedIds.map((id, index) => ({ id, sortOrder: slots[index] }));
    for (const update of updates) await db.tasks.update(update.id, { sortOrder: update.sortOrder });
    return updates;
  });
}

export async function reorderSubtasks(
  taskId: number,
  orderedIds: readonly number[],
): Promise<SortOrderUpdate[]> {
  if (orderedIds.length < 2) return [];
  assertUniqueIds(orderedIds);

  return db.transaction('rw', db.subtasks, async () => {
    const records = await db.subtasks.bulkGet([...orderedIds]);
    if (records.some((record) => !record)) throw new Error('Every reordered subtask must exist');
    const subtasks = records.filter((record) => record !== undefined);
    if (subtasks.some((subtask) => subtask.taskId !== taskId)) {
      throw new Error('Reordered subtasks must belong to the same task');
    }
    if (subtasks.some((subtask) => subtask.completed)) {
      throw new Error('Completed subtasks cannot be manually reordered');
    }

    const slots = subtasks.map((subtask) => subtask.sortOrder).sort((a, b) => a - b);
    const updates = orderedIds.map((id, index) => ({ id, sortOrder: slots[index] }));
    for (const update of updates) {
      await db.subtasks.update(update.id, { sortOrder: update.sortOrder });
    }
    return updates;
  });
}
