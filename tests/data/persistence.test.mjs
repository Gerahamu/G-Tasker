import 'fake-indexeddb/auto';
/* global Event, EventTarget */
import { Blob } from 'node:buffer';
import { setTimeout } from 'node:timers';
import assert from 'node:assert/strict';
import { test, beforeEach, after } from 'node:test';

// In-memory IndexedDB only: no browser profile or real user database is opened.
const { db } = await import('../../src/db/database.ts');
const { useTaskStore } = await import('../../src/stores/task-store.ts');
const { useListStore } = await import('../../src/stores/list-store.ts');
const { usePlanStore } = await import('../../src/stores/plan-store.ts');
const { exportDatabaseBackup } = await import('../../src/db/export-backup.ts');
const { initAutoSave, stopAutoSave } = await import('../../src/autosave/autosave-engine.ts');

beforeEach(async () => {
  stopAutoSave();
  useTaskStore.setState({ tasks: [], dirtyIds: new Set() });
  useListStore.setState({ lists: [], dirtyIds: new Set() });
  usePlanStore.setState({ plannings: [] });
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
});
after(() => {
  stopAutoSave();
  db.close();
});

async function seedTask() {
  const task = { id: 1, listId: 1, title: 'original', sortOrder: 0, updatedAt: 'same' };
  await db.tasks.add(task);
  useTaskStore.setState({ tasks: [task] });
  return task;
}

test('store drains a second edit arriving during the first database update', async () => {
  await seedTask();
  useTaskStore.getState().updateTask(1, { title: 'first' });
  const update = db.tasks.update;
  let calls = 0;
  db.tasks.update = function (...args) {
    if (++calls === 1) useTaskStore.getState().updateTask(1, { title: 'latest' });
    return update.apply(this, args);
  };
  try {
    await useTaskStore.getState().saveDirtyTasks();
  } finally {
    db.tasks.update = update;
  }
  assert.equal((await db.tasks.get(1)).title, 'latest');
  assert.equal(useTaskStore.getState().dirtyIds.size, 0);
  assert.equal(calls, 2);
});

test('loading from disk does not overwrite a dirty in-memory task', async () => {
  await seedTask();
  useTaskStore.getState().updateTask(1, { title: 'unsaved' });
  await useTaskStore.getState().loadAllTasks();
  assert.equal(useTaskStore.getState().tasks[0].title, 'unsaved');
  await useTaskStore.getState().saveDirtyTasks();
  assert.equal((await db.tasks.get(1)).title, 'unsaved');
});

test('task completion time is saved and cleared with the completion state', async () => {
  await seedTask();
  useTaskStore.getState().completeTask(1);
  const completedAt = useTaskStore.getState().tasks[0].completedAt;
  assert.ok(completedAt);
  await useTaskStore.getState().saveDirtyTasks();
  assert.equal((await db.tasks.get(1)).completedAt, completedAt);

  useTaskStore.getState().completeTask(1);
  assert.equal(useTaskStore.getState().tasks[0].completedAt, null);
  await useTaskStore.getState().saveDirtyTasks();
  assert.equal((await db.tasks.get(1)).completedAt, null);
});

test('recurring completion creates one persisted next occurrence and undo removes it', async () => {
  const now = new Date().toISOString();
  const task = {
    id: 1,
    listId: 1,
    title: 'daily repeat',
    notes: '',
    priority: 'low',
    isFlagged: false,
    dueDate: '2026-09-29',
    dueTime: null,
    completedAt: null,
    sortOrder: 1,
    parentTaskId: null,
    recurrenceRuleId: null,
    locationTriggerId: null,
    status: 'active',
    milestones: '[]',
    durationMinutes: null,
    repeatRule: { frequency: 'daily' },
    reminder: null,
    timeFlexibility: 'anytime',
    timeWindowStart: null,
    timeWindowEnd: null,
    reschedulePolicy: 'overdue',
    timeBlockLocked: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.tasks.add(task);
  useTaskStore.setState({ tasks: [task], dirtyIds: new Set() });

  useTaskStore.getState().setTaskCompleted(1, true);
  await useTaskStore.getState().saveDirtyTasks();
  const nextOccurrenceId = await useTaskStore.getState().createNextRecurringOccurrence(1);

  assert.equal(typeof nextOccurrenceId, 'number');
  assert.equal((await db.tasks.get(1)).recurrenceRuleId, 1);
  assert.equal((await db.tasks.get(nextOccurrenceId)).dueDate, '2026-09-30');
  assert.equal(await db.tasks.count(), 2);

  await useTaskStore.getState().revertTaskCompletion(1, nextOccurrenceId);
  assert.equal((await db.tasks.get(1)).completedAt, null);
  assert.equal(await db.tasks.get(nextOccurrenceId), undefined);
  assert.equal(await db.tasks.count(), 1);
});

test('failed writes retain dirty state and retry successfully', async () => {
  await seedTask();
  useTaskStore.getState().updateTask(1, { title: 'retry' });
  const hook = () => {
    throw new Error('simulated disk failure');
  };
  db.tasks.hook('updating', hook);
  try {
    await assert.rejects(useTaskStore.getState().saveDirtyTasks(), /disk failure/);
  } finally {
    db.tasks.hook('updating').unsubscribe(hook);
  }
  assert.equal(useTaskStore.getState().dirtyIds.has(1), true);
  assert.equal((await db.tasks.get(1)).title, 'original');
  await useTaskStore.getState().saveDirtyTasks();
  assert.equal((await db.tasks.get(1)).title, 'retry');
});

test('saving a stale dirty object cannot recreate a deleted task', async () => {
  await seedTask();
  useTaskStore.getState().updateTask(1, { title: 'stale' });
  await db.tasks.delete(1);
  await useTaskStore.getState().saveDirtyTasks();
  assert.equal(await db.tasks.get(1), undefined);
});

test('task deletion rolls back on related-table failure, then succeeds cleanly', async () => {
  await seedTask();
  await db.subtasks.add({ taskId: 1, title: 'child', sortOrder: 0 });
  const hook = () => {
    throw new Error('child failure');
  };
  db.subtasks.hook('deleting', hook);
  try {
    await assert.rejects(useTaskStore.getState().deleteTask(1), /child failure/);
  } finally {
    db.subtasks.hook('deleting').unsubscribe(hook);
  }
  assert.ok(await db.tasks.get(1));
  assert.equal(await db.subtasks.count(), 1);
  assert.equal(useTaskStore.getState().tasks.length, 1);
  useTaskStore.getState().updateTask(1, { title: 'dirty before delete' });
  await useTaskStore.getState().deleteTask(1);
  await useTaskStore.getState().saveDirtyTasks();
  assert.equal(await db.tasks.count(), 0);
  assert.equal(await db.subtasks.count(), 0);
  assert.equal(useTaskStore.getState().dirtyIds.size, 0);
});

test('list deletion rolls back if deleting its tasks fails', async () => {
  await seedTask();
  await db.taskLists.add({ id: 1, name: 'list', sortOrder: 0 });
  const hook = () => {
    throw new Error('task deletion failure');
  };
  db.tasks.hook('deleting', hook);
  try {
    await assert.rejects(useListStore.getState().deleteList(1), /task deletion failure/);
  } finally {
    db.tasks.hook('deleting').unsubscribe(hook);
  }
  assert.ok(await db.taskLists.get(1));
  assert.ok(await db.tasks.get(1));
});

test('failed planning update leaves persisted and in-memory state unchanged', async () => {
  const plan = {
    id: 1,
    title: 'plan',
    goal: '',
    note: '',
    periodType: 'custom',
    startDate: '2026-09-02',
    endDate: '2026-09-02',
    taskIds: [],
    milestones: [],
    lanes: [],
    createdAt: '2026-09-02',
    updatedAt: '2026-09-02',
  };
  await db.plannings.add(plan);
  usePlanStore.setState({ plannings: [plan] });
  const hook = () => {
    throw new Error('plan update failure');
  };
  db.plannings.hook('updating', hook);
  try {
    await assert.rejects(
      usePlanStore.getState().updatePlanning(1, { title: 'copy' }),
      /plan update failure/,
    );
  } finally {
    db.plannings.hook('updating').unsubscribe(hook);
  }
  assert.equal((await db.plannings.get(1)).title, 'plan');
  assert.equal(usePlanStore.getState().plannings[0].title, 'plan');
});

test('backup includes every table, pending edits, legacy fields and attachment bytes', async () => {
  await seedTask();
  useTaskStore.getState().updateTask(1, { title: 'export latest' });
  await db.memos.add({ title: 'memo' });
  await db.attachments.add({
    taskId: 1,
    fileName: 'test.bin',
    blob: new Blob([new Uint8Array([0, 128, 255])], { type: 'application/octet-stream' }),
  });
  const backup = await exportDatabaseBackup();
  assert.deepEqual(Object.keys(backup.tables).sort(), db.tables.map((t) => t.name).sort());
  assert.equal(backup.tasks[0].title, 'export latest');
  assert.equal(backup.tables.memos[0].title, 'memo');
  assert.equal(backup.tables.attachments[0].blob.base64, 'AID/');
  assert.equal(backup.tables.attachments[0].blob.mimeType, 'application/octet-stream');
  assert.deepEqual(backup.lists, backup.tables.taskLists);
  assert.deepEqual(backup.markers, backup.tables.calendarMarkers);
});

test('autosave init/stop is idempotent and new edits save without waiting for exit', async () => {
  globalThis.window = new EventTarget();
  globalThis.document = new EventTarget();
  await seedTask();
  initAutoSave();
  initAutoSave();
  useTaskStore.getState().updateTask(1, { title: 'auto' });
  const pendingExit = new Event('beforeunload', { cancelable: true });
  Object.defineProperty(pendingExit, 'returnValue', { value: '', writable: true });
  globalThis.window.dispatchEvent(pendingExit);
  assert.equal(pendingExit.defaultPrevented, true);
  await useTaskStore.getState().saveDirtyTasks();
  assert.equal((await db.tasks.get(1)).title, 'auto');
  const savedExit = new Event('beforeunload', { cancelable: true });
  globalThis.window.dispatchEvent(savedExit);
  assert.equal(savedExit.defaultPrevented, false);
  stopAutoSave();
  useTaskStore.getState().updateTask(1, { title: 'stopped' });
  const stoppedExit = new Event('beforeunload', { cancelable: true });
  globalThis.window.dispatchEvent(stoppedExit);
  assert.equal(stoppedExit.defaultPrevented, false);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal((await db.tasks.get(1)).title, 'auto');
});
