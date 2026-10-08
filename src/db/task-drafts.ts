import { db } from './database';
import { snapshotFromLegacyTask } from '../lib/task-draft';
import type { TaskDraft, TaskFormSnapshot } from '../lib/types';

let migrationInFlight: Promise<number> | null = null;

export async function saveTaskDraft(snapshot: TaskFormSnapshot): Promise<number> {
  const title = snapshot.task.title.trim();
  if (!title) throw new Error('A task draft requires a title');
  const now = new Date().toISOString();
  return (await db.taskDrafts.add({
    title,
    snapshot: structuredClone(snapshot),
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  })) as number;
}

export async function listTaskDrafts(): Promise<TaskDraft[]> {
  return db.taskDrafts.orderBy('updatedAt').reverse().toArray();
}

export async function getTaskDraft(id: number): Promise<TaskDraft | undefined> {
  return db.taskDrafts.get(id);
}

export async function deleteTaskDraft(id: number): Promise<void> {
  await db.taskDrafts.delete(id);
}

async function runLegacyDraftMigration(): Promise<number> {
  return db.transaction(
    'rw',
    [
      db.tasks,
      db.taskDrafts,
      db.subtasks,
      db.attachments,
      db.taskTags,
      db.taskDependencies,
      db.reminders,
      db.notificationLogs,
    ],
    async () => {
      const legacyDrafts = await db.tasks.where('status').equals('draft').toArray();
      let migrated = 0;
      for (const task of legacyDrafts) {
        if (task.id === undefined) continue;
        const legacyTaskId = task.id;
        const existing = await db.taskDrafts.where('legacyTaskId').equals(legacyTaskId).first();
        const [attachments, dependencies, reminders, notificationLogs] = await Promise.all([
          db.attachments.where('taskId').equals(legacyTaskId).count(),
          db.taskDependencies
            .filter(
              (relation) =>
                relation.taskId === legacyTaskId || relation.dependsOnTaskId === legacyTaskId,
            )
            .count(),
          db.reminders.where('taskId').equals(legacyTaskId).count(),
          db.notificationLogs.where('taskId').equals(legacyTaskId).count(),
        ]);
        const hasUnsupportedLegacyData =
          attachments > 0 ||
          dependencies > 0 ||
          reminders > 0 ||
          notificationLogs > 0 ||
          task.recurrenceRuleId !== null ||
          task.locationTriggerId !== null;
        if (!existing) {
          const [subtasks, taskTags] = await Promise.all([
            db.subtasks.where('taskId').equals(legacyTaskId).sortBy('sortOrder'),
            db.taskTags.where('taskId').equals(legacyTaskId).toArray(),
          ]);
          await db.taskDrafts.add({
            title: task.title,
            snapshot: snapshotFromLegacyTask(
              task,
              subtasks.map((subtask) => subtask.title),
              taskTags.map((relation) => relation.tagId),
            ),
            schemaVersion: 1,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            legacyTaskId,
          });
          migrated += 1;
        }
        // Preserve non-standard legacy records whose extra relations cannot be
        // represented by the current create-task form snapshot.
        if (hasUnsupportedLegacyData) continue;
        await Promise.all([
          db.subtasks.where('taskId').equals(legacyTaskId).delete(),
          db.taskTags.where('taskId').equals(legacyTaskId).delete(),
        ]);
        await db.tasks.delete(legacyTaskId);
      }
      return migrated;
    },
  );
}

export function migrateLegacyTaskDrafts(): Promise<number> {
  migrationInFlight ??= runLegacyDraftMigration().finally(() => {
    migrationInFlight = null;
  });
  return migrationInFlight;
}
