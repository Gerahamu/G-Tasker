import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';

const { db } = await import('../../src/db/database.ts');
const { deleteTaskDraft, getTaskDraft, listTaskDrafts, migrateLegacyTaskDrafts, saveTaskDraft } =
  await import('../../src/db/task-drafts.ts');
const { captureTaskFormSnapshot, createDefaultTaskFormState, hydrateTaskFormSnapshot } =
  await import('../../src/lib/task-draft.ts');
const { createTaskRecord } = await import('../../src/db/task-operations.ts');
const { TaskFormValidationError } = await import('../../src/lib/task-draft.ts');

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
});

after(() => db.close());

function complexForm() {
  return {
    ...createDefaultTaskFormState({ listId: 7, dueDate: '' }),
    title: 'Physics Review',
    notes: 'Chapter 4',
    priority: 'high',
    isFlagged: true,
    showMoreSettings: true,
    showPreciseTime: true,
    dateStart: '2026-09-15',
    dateStartTime: '18:30',
    dueDate: '2026-09-15',
    dueTime: '20:00',
    durationMinutes: 90,
    repeatFrequency: 'custom',
    repeatInterval: 2,
    repeatUnit: 'week',
    repeatWeekdays: [2, 4],
    repeatEndDate: '2026-12-31',
    reminderMode: 'custom',
    customReminderMinutes: 45,
    timeFlexibility: 'window',
    timeWindowStart: '17:00',
    timeWindowEnd: '21:00',
    reschedulePolicy: 'next_available',
    timeBlockLocked: true,
    showSubtasks: true,
    subtaskTitles: ['Read notes', 'Solve problems'],
  };
}

test('a complete task form snapshot survives a database reopen and hydrates every field', async () => {
  const form = complexForm();
  const snapshot = captureTaskFormSnapshot(form, 1);
  const draftId = await saveTaskDraft(snapshot);

  assert.equal(await db.tasks.count(), 0);
  db.close();
  await db.open();

  const persisted = await getTaskDraft(draftId);
  assert.ok(persisted);
  assert.deepEqual(persisted.snapshot, snapshot);
  assert.deepEqual(hydrateTaskFormSnapshot(persisted.snapshot), form);
});

test('active task creation persists every create setting and subtask across a database reopen', async () => {
  const snapshot = captureTaskFormSnapshot(complexForm(), 1);
  const created = await createTaskRecord(
    { ...snapshot.task, status: 'active' },
    { subtaskTitles: snapshot.subtaskTitles },
  );

  db.close();
  await db.open();

  const persisted = await db.tasks.get(created.id);
  assert.ok(persisted);
  assert.deepEqual(
    {
      ...persisted,
      id: undefined,
      completedAt: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      sortOrder: undefined,
      status: undefined,
    },
    {
      ...snapshot.task,
      id: undefined,
      completedAt: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      sortOrder: undefined,
      status: undefined,
    },
  );
  assert.deepEqual(
    (await db.subtasks.where('taskId').equals(created.id).sortBy('sortOrder')).map(
      (subtask) => subtask.title,
    ),
    snapshot.subtaskTitles,
  );
});

test('submission clears a due time that the user hid before creating', () => {
  const snapshot = captureTaskFormSnapshot(
    {
      ...createDefaultTaskFormState({ listId: 1, dueDate: '2026-09-20' }),
      title: 'No hidden time',
      dueTime: '09:45',
      showDueTime: false,
    },
    1,
  );

  assert.equal(snapshot.task.dueDate, '2026-09-20');
  assert.equal(snapshot.task.dueTime, null);
});

test('window duration persists without requiring precise start and end dates', () => {
  const snapshot = captureTaskFormSnapshot(
    {
      ...createDefaultTaskFormState({ listId: 1, dueDate: '2026-09-20' }),
      title: 'Window task',
      timeFlexibility: 'window',
      timeWindowStart: '09:00',
      timeWindowEnd: '12:00',
      durationMinutes: 45,
    },
    1,
  );

  assert.equal(snapshot.task.durationMinutes, 45);
  assert.equal(snapshot.task.timeWindowStart, '09:00');
  assert.equal(snapshot.task.timeWindowEnd, '12:00');
});

test('the configured default reminder becomes a due-anchored reminder and survives hydration', () => {
  const form = {
    ...createDefaultTaskFormState({
      listId: 1,
      dueDate: '2026-09-20',
      defaultReminderMinutes: 15,
    }),
    title: 'Default reminder',
  };
  const snapshot = captureTaskFormSnapshot(form, 1);

  assert.deepEqual(snapshot.task.reminder, { anchor: 'due', minutesBefore: 15 });
  assert.equal(hydrateTaskFormSnapshot(snapshot).reminderMode, 'due_before');
  assert.equal(hydrateTaskFormSnapshot(snapshot).customReminderMinutes, 15);
});

test('submission rejects advanced settings that have no usable date or time anchor', () => {
  const base = {
    ...createDefaultTaskFormState({ listId: 1, dueDate: '' }),
    title: 'Invalid advanced settings',
  };

  for (const patch of [
    { repeatFrequency: 'daily' },
    { reminderMode: 'due' },
    { timeFlexibility: 'window', timeWindowStart: '12:00', timeWindowEnd: '09:00' },
    { timeFlexibility: 'window', timeWindowStart: '09:00', timeWindowEnd: '12:00' },
    { timeFlexibility: 'fixed' },
    { reschedulePolicy: 'tomorrow' },
  ]) {
    assert.throws(() => captureTaskFormSnapshot({ ...base, ...patch }, 1), TaskFormValidationError);
  }
});

test('inactive advanced controls cannot leak stale values or block submission', () => {
  const snapshot = captureTaskFormSnapshot(
    {
      ...createDefaultTaskFormState({ listId: 1, dueDate: '2026-09-20' }),
      title: 'Cleared options',
      repeatFrequency: 'none',
      repeatInterval: 0,
      repeatWeekdays: [1, 3],
      repeatEndDate: 'invalid',
      reminderMode: 'none',
      customReminderMinutes: 0,
      timeFlexibility: 'anytime',
      timeWindowStart: 'invalid',
      timeWindowEnd: 'invalid',
    },
    1,
  );

  assert.equal(snapshot.task.repeatRule, null);
  assert.equal(snapshot.task.reminder, null);
  assert.equal(snapshot.task.timeWindowStart, null);
  assert.equal(snapshot.task.timeWindowEnd, null);
});

test('blank and whitespace-only draft titles cannot write a database row', async () => {
  for (const title of ['', '     ']) {
    const form = { ...createDefaultTaskFormState({ listId: 1, dueDate: '' }), title };
    const snapshot = captureTaskFormSnapshot(form, 1);
    await assert.rejects(saveTaskDraft(snapshot), /requires a title/);
  }
  assert.equal(await db.taskDrafts.count(), 0);
  assert.equal(await db.tasks.count(), 0);
});

test('deleting a draft removes only the selected draft and never touches tasks', async () => {
  const snapshot = captureTaskFormSnapshot(complexForm(), 1);
  const firstId = await saveTaskDraft(snapshot);
  const secondId = await saveTaskDraft({
    ...snapshot,
    task: { ...snapshot.task, title: 'Keep this draft' },
  });
  await db.tasks.add({
    ...snapshot.task,
    title: 'Keep this task',
    completedAt: null,
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-12T00:00:00.000Z',
    sortOrder: 1,
    status: 'active',
  });

  await deleteTaskDraft(firstId);

  assert.equal(await getTaskDraft(firstId), undefined);
  assert.ok(await getTaskDraft(secondId));
  assert.equal(await db.tasks.count(), 1);
});

test('loading a draft and creating a task uses normal task identity and preserves the draft', async () => {
  const snapshot = captureTaskFormSnapshot(complexForm(), 1);
  const draftId = await saveTaskDraft(snapshot);
  await db.tasks.add({
    id: 41,
    ...snapshot.task,
    title: 'Existing task',
    completedAt: null,
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-12T00:00:00.000Z',
    sortOrder: 1,
    status: 'active',
  });

  const created = await createTaskRecord(
    { ...snapshot.task, status: 'active' },
    { subtaskTitles: snapshot.subtaskTitles },
  );

  assert.equal(created.id, 42);
  assert.equal(created.task.status, 'active');
  assert.equal(await db.taskDrafts.count(), 1);
  assert.ok(await getTaskDraft(draftId));
  assert.deepEqual(
    (await db.subtasks.where('taskId').equals(created.id).sortBy('sortOrder')).map(
      (subtask) => subtask.title,
    ),
    snapshot.subtaskTitles,
  );
});

test('legacy hidden draft tasks migrate atomically with subtasks and tags', async () => {
  const snapshot = captureTaskFormSnapshot(complexForm(), 1);
  await db.tasks.add({
    id: 9,
    ...snapshot.task,
    completedAt: null,
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-11T10:00:00.000Z',
    sortOrder: 4,
    status: 'draft',
  });
  await db.subtasks.bulkAdd([
    { taskId: 9, title: 'Legacy A', completed: false, sortOrder: 1 },
    { taskId: 9, title: 'Legacy B', completed: false, sortOrder: 2 },
  ]);
  await db.taskTags.bulkAdd([
    { taskId: 9, tagId: 3 },
    { taskId: 9, tagId: 5 },
  ]);

  assert.equal(await migrateLegacyTaskDrafts(), 1);
  assert.equal(await db.tasks.get(9), undefined);
  assert.equal(await db.subtasks.where('taskId').equals(9).count(), 0);
  assert.equal(await db.taskTags.where('taskId').equals(9).count(), 0);
  const [migrated] = await listTaskDrafts();
  assert.equal(migrated.legacyTaskId, 9);
  assert.deepEqual(migrated.snapshot.subtaskTitles, ['Legacy A', 'Legacy B']);
  assert.deepEqual(migrated.snapshot.tagIds, [3, 5]);
  assert.equal(await migrateLegacyTaskDrafts(), 0);
  assert.equal(await db.taskDrafts.count(), 1);
});

test('legacy migration rolls back without touching the source when draft persistence fails', async () => {
  const snapshot = captureTaskFormSnapshot(complexForm(), 1);
  await db.tasks.add({
    id: 12,
    ...snapshot.task,
    completedAt: null,
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-11T10:00:00.000Z',
    sortOrder: 4,
    status: 'draft',
  });
  await db.subtasks.add({ taskId: 12, title: 'Must survive', completed: false, sortOrder: 1 });
  const hook = () => {
    throw new Error('draft migration write failed');
  };
  db.taskDrafts.hook('creating', hook);
  try {
    await assert.rejects(migrateLegacyTaskDrafts(), /draft migration write failed/);
  } finally {
    db.taskDrafts.hook('creating').unsubscribe(hook);
  }

  assert.ok(await db.tasks.get(12));
  assert.equal(await db.subtasks.where('taskId').equals(12).count(), 1);
  assert.equal(await db.taskDrafts.count(), 0);
});

test('non-standard legacy draft relations are retained as a data-safety fallback', async () => {
  const snapshot = captureTaskFormSnapshot(complexForm(), 1);
  await db.tasks.add({
    id: 15,
    ...snapshot.task,
    completedAt: null,
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-11T10:00:00.000Z',
    sortOrder: 4,
    status: 'draft',
  });
  await db.attachments.add({ taskId: 15, fileName: 'legacy-only.pdf' });

  assert.equal(await migrateLegacyTaskDrafts(), 1);
  assert.ok(await db.tasks.get(15));
  assert.equal(await db.attachments.where('taskId').equals(15).count(), 1);
  assert.equal(await db.taskDrafts.where('legacyTaskId').equals(15).count(), 1);
  assert.equal(await migrateLegacyTaskDrafts(), 0);
  assert.equal(await db.taskDrafts.where('legacyTaskId').equals(15).count(), 1);
});
