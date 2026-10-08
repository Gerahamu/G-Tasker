import { db } from './database';
import type { Task, TaskCreationData } from '../lib/types';
import { nextRecurringTaskDate } from '../lib/task-recurrence';
import { taskDateMovePatch } from '../lib/daily-reminders';

export const DEFAULT_LIST_NAME = '默认列表';

export interface TaskCreationRelations {
  subtaskTitles?: string[];
}

export type NewTaskInput = TaskCreationData &
  Partial<Pick<Task, 'completedAt' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'status'>>;

export const taskCascadeTables = [
  db.tasks,
  db.subtasks,
  db.attachments,
  db.taskTags,
  db.taskDependencies,
  db.reminders,
  db.notificationLogs,
  db.recurrenceRules,
  db.locationTriggers,
  db.plannings,
];

export async function ensureDefaultList(): Promise<number> {
  return db.transaction('rw', [db.taskLists, db.tasks], async () => {
    const defaults = await db.taskLists.filter((list) => list.name === DEFAULT_LIST_NAME).toArray();
    if (defaults.length === 0) {
      return (await db.taskLists.add({
        name: DEFAULT_LIST_NAME,
        color: '#3b82f6',
        icon: 'List',
        sortOrder: 1,
        isSmartList: false,
        filterConfig: null,
        createdAt: new Date().toISOString(),
      })) as number;
    }

    defaults.sort((left, right) => (left.id ?? 0) - (right.id ?? 0));
    const canonicalId = defaults[0].id!;
    const duplicateIds = defaults.slice(1).map((list) => list.id!);
    for (const duplicateId of duplicateIds) {
      await db.tasks.where('listId').equals(duplicateId).modify({ listId: canonicalId });
    }
    if (duplicateIds.length > 0) await db.taskLists.bulkDelete(duplicateIds);
    return canonicalId;
  });
}

export async function insertTaskInCurrentTransaction(
  input: NewTaskInput,
  relations: TaskCreationRelations = {},
): Promise<{ id: number; task: Task }> {
  const now = new Date().toISOString();
  const listTasks = await db.tasks.where('listId').equals(input.listId).toArray();
  const maxOrder = listTasks.reduce((max, task) => Math.max(max, task.sortOrder ?? 0), 0);
  const task: Task = {
    ...input,
    completedAt: input.completedAt ?? null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    sortOrder: maxOrder + 1,
    dateTarget: input.dateTarget ?? null,
    status: input.status ?? 'active',
    milestones: input.milestones ?? '[]',
    durationMinutes: input.durationMinutes ?? null,
    repeatRule: input.repeatRule ?? null,
    reminder: input.reminder ?? null,
    timeFlexibility: input.timeFlexibility ?? 'anytime',
    timeWindowStart: input.timeWindowStart ?? null,
    timeWindowEnd: input.timeWindowEnd ?? null,
    reschedulePolicy: input.reschedulePolicy ?? 'overdue',
    timeBlockLocked: input.timeBlockLocked ?? false,
  };
  const id = (await db.tasks.add(task)) as number;

  const subtaskTitles = (relations.subtaskTitles ?? [])
    .map((title) => title.trim())
    .filter(Boolean);
  if (subtaskTitles.length > 0) {
    await db.subtasks.bulkAdd(
      subtaskTitles.map((title, index) => ({
        taskId: id,
        title,
        completed: false,
        completedAt: null,
        sortOrder: index + 1,
        dueDate: null,
        dueTime: null,
        notes: '',
        createdAt: now,
      })),
    );
  }

  return { id, task: { ...task, id } };
}

export async function createTaskRecord(
  input: NewTaskInput,
  relations: TaskCreationRelations = {},
): Promise<{ id: number; task: Task }> {
  return db.transaction('rw', [db.tasks, db.subtasks], () =>
    insertTaskInCurrentTransaction(input, relations),
  );
}

/**
 * Completes the current recurring occurrence and creates exactly one next
 * occurrence. The recurrence id is assigned lazily so legacy repeated tasks
 * can use the same path without a database migration.
 */
export async function createNextRecurringTask(
  source: Task,
): Promise<{ sourceId: number; recurrenceRuleId: number; task: Task } | null> {
  if (source.id === undefined || !source.repeatRule || !source.completedAt) return null;
  const nextDate = nextRecurringTaskDate(source);
  if (!nextDate) return null;
  const sourceId = source.id;

  return db.transaction('rw', [db.tasks, db.recurrenceRules], async () => {
    const current = await db.tasks.get(sourceId);
    if (!current) return null;

    let recurrenceRuleId = current.recurrenceRuleId ?? null;
    if (recurrenceRuleId === null) {
      recurrenceRuleId = (await db.recurrenceRules.add({
        rruleString: JSON.stringify(source.repeatRule),
        workdayMode: false,
        exclusionDates: '[]',
        modifiedInstances: '[]',
        createdAt: new Date().toISOString(),
      })) as number;
      await db.tasks.update(sourceId, { recurrenceRuleId });
    }

    // recurrenceRuleId is persisted data but is not part of the legacy tasks
    // index. Filtering keeps recurrence compatible with existing databases
    // without introducing a schema migration during the v1 audit.
    const siblings = await db.tasks
      .filter((task) => task.recurrenceRuleId === recurrenceRuleId)
      .toArray();
    if (siblings.some((task) => task.id !== sourceId && task.dueDate === nextDate)) return null;

    const listTasks = await db.tasks.where('listId').equals(current.listId).toArray();
    const maxOrder = listTasks.reduce((max, task) => Math.max(max, task.sortOrder ?? 0), 0);
    const datePatch = taskDateMovePatch(current, nextDate);
        /* eslint-disable @typescript-eslint/no-unused-vars */
    const { id: _id, completedAt: _completedAt, createdAt: _createdAt, updatedAt: _updatedAt, sortOrder: _sortOrder, ...taskData } = current;
    /* eslint-enable @typescript-eslint/no-unused-vars */
    const now = new Date().toISOString();
    const nextTask: Task = {
      ...taskData,
      ...datePatch,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      sortOrder: maxOrder + 1,
      status: 'active',
      recurrenceRuleId,
    };
    const id = (await db.tasks.add(nextTask)) as number;
    return { sourceId, recurrenceRuleId, task: { ...nextTask, id } };
  });
}

export async function deleteTasksCascade(rootTaskIds: number[]): Promise<number[]> {
  const ids = new Set(rootTaskIds);
  let frontier = [...ids];
  while (frontier.length > 0) {
    const children = await db.tasks.where('parentTaskId').anyOf(frontier).primaryKeys();
    frontier = children.filter((id): id is number => typeof id === 'number' && !ids.has(id));
    for (const id of frontier) ids.add(id);
  }
  const taskIds = [...ids];
  if (taskIds.length === 0) return [];
  const tasks = (await db.tasks.bulkGet(taskIds)).filter(
    (task): task is Task => task !== undefined,
  );
  const recurrenceRuleIds = new Set(
    tasks.map((task) => task.recurrenceRuleId).filter((id): id is number => typeof id === 'number'),
  );
  const locationTriggerIds = new Set(
    tasks
      .map((task) => task.locationTriggerId)
      .filter((id): id is number => typeof id === 'number'),
  );

  await db.subtasks.where('taskId').anyOf(taskIds).delete();
  await db.attachments.where('taskId').anyOf(taskIds).delete();
  await db.taskTags.where('taskId').anyOf(taskIds).delete();
  await db.taskDependencies
    .filter((relation) => ids.has(relation.taskId) || ids.has(relation.dependsOnTaskId))
    .delete();
  await db.reminders.where('taskId').anyOf(taskIds).delete();
  await db.notificationLogs.where('taskId').anyOf(taskIds).delete();
  await db.tasks.bulkDelete(taskIds);
  for (const recurrenceRuleId of recurrenceRuleIds) {
    const stillUsed = await db.tasks
      .filter((task) => task.recurrenceRuleId === recurrenceRuleId)
      .first();
    if (!stillUsed) await db.recurrenceRules.delete(recurrenceRuleId);
  }
  for (const locationTriggerId of locationTriggerIds) {
    const stillUsed = await db.tasks
      .filter((task) => task.locationTriggerId === locationTriggerId)
      .first();
    if (!stillUsed) await db.locationTriggers.delete(locationTriggerId);
  }

  // Cleanup task IDs from plannings
  const affectedPlannings = await db.plannings
    .filter((p) => p.taskIds.some((id) => ids.has(id)) || p.lanes.some((l) => l.taskIds.some((id) => ids.has(id))))
    .toArray();
  for (const p of affectedPlannings) {
    p.taskIds = p.taskIds.filter((id) => !ids.has(id));
    p.lanes = p.lanes.map((l) => ({ ...l, taskIds: l.taskIds.filter((id) => !ids.has(id)) }));
    await db.plannings.put(p);
  }

  return taskIds;
}
