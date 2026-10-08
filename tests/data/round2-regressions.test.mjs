import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';

const { db } = await import('../../src/db/database.ts');
const { reorderSubtasks, reorderTasks } = await import('../../src/db/task-ordering.ts');
const { sortCompletedLast } = await import('../../src/lib/completion-sort.ts');
const { beginCompletionOperation, isCurrentCompletionOperation } =
  await import('../../src/lib/completion-operation.ts');

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
});

after(() => db.close());

function task(id, listId, sortOrder, completedAt = null) {
  return {
    id,
    listId,
    title: `task-${id}`,
    notes: '',
    priority: 'medium',
    isFlagged: false,
    dueDate: null,
    dueTime: null,
    completedAt,
    createdAt: `2026-09-11T00:00:0${id}.000Z`,
    updatedAt: '2026-09-11T00:00:00.000Z',
    sortOrder,
    recurrenceRuleId: null,
    parentTaskId: null,
    locationTriggerId: null,
    templateId: null,
    dateMode: 'simple',
    dateStart: null,
    dateEnd: null,
    dateTarget: null,
    status: 'active',
    milestones: '[]',
  };
}

function subtask(id, taskId, sortOrder, completed = false, completedAt = null) {
  return {
    id,
    taskId,
    title: `subtask-${id}`,
    completed,
    completedAt,
    sortOrder,
    dueDate: null,
    dueTime: null,
    notes: '',
    createdAt: `2026-09-11T00:00:0${id}.000Z`,
  };
}

test('task reorder persists only within one list and preserves completed sort slots', async () => {
  await db.tasks.bulkAdd([
    task(1, 1, 10),
    task(2, 1, 20, '2026-09-11T01:00:00.000Z'),
    task(3, 1, 30),
  ]);

  await reorderTasks([3, 1]);

  const rows = await db.tasks.orderBy('id').toArray();
  assert.deepEqual(
    rows.map(({ id, sortOrder }) => [id, sortOrder]),
    [
      [1, 30],
      [2, 20],
      [3, 10],
    ],
  );
});

test('task reorder rejects mixed-list input without partial writes', async () => {
  await db.tasks.bulkAdd([task(1, 1, 10), task(2, 2, 20)]);
  await assert.rejects(reorderTasks([2, 1]), /same list/i);
  assert.deepEqual(
    (await db.tasks.orderBy('id').toArray()).map((row) => row.sortOrder),
    [10, 20],
  );
});

test('task reorder transaction rolls back when an update fails', async () => {
  await db.tasks.bulkAdd([task(1, 1, 10), task(2, 1, 20)]);
  const hook = (_mods, primaryKey) => {
    if (primaryKey === 1) throw new Error('reorder failure');
  };
  db.tasks.hook('updating', hook);
  try {
    await assert.rejects(reorderTasks([2, 1]), /reorder failure/);
  } finally {
    db.tasks.hook('updating').unsubscribe(hook);
  }
  assert.deepEqual(
    (await db.tasks.orderBy('id').toArray()).map((row) => row.sortOrder),
    [10, 20],
  );
});

test('subtask reorder is parent-scoped and transactionally persisted', async () => {
  await db.subtasks.bulkAdd([
    subtask(1, 7, 0),
    subtask(2, 7, 1, true, '2026-09-11T01:00:00.000Z'),
    subtask(3, 7, 2),
  ]);
  await reorderSubtasks(7, [3, 1]);
  assert.deepEqual(
    (await db.subtasks.orderBy('id').toArray()).map(({ id, sortOrder }) => [id, sortOrder]),
    [
      [1, 2],
      [2, 1],
      [3, 0],
    ],
  );
  await assert.rejects(reorderSubtasks(8, [1, 3]), /same task/i);
});

test('completed-last sorting is deterministic for current and legacy records', () => {
  const rows = [
    { id: 4, sortOrder: 4, createdAt: '2026-01-04', done: true, completedAt: null },
    { id: 2, sortOrder: 2, createdAt: '2026-01-02', done: false, completedAt: null },
    { id: 1, sortOrder: 1, createdAt: '2026-01-01', done: false, completedAt: null },
    { id: 5, sortOrder: 5, createdAt: '2026-01-05', done: true, completedAt: '2026-02-02' },
    { id: 3, sortOrder: 3, createdAt: '2026-01-03', done: true, completedAt: '2026-02-01' },
  ];
  const sorted = sortCompletedLast(
    rows,
    (row) => row.done,
    (row) => row.completedAt,
    {
      getSortOrder: (row) => row.sortOrder,
      getCreatedAt: (row) => row.createdAt,
      getId: (row) => row.id,
    },
  );
  assert.deepEqual(
    sorted.map((row) => row.id),
    [1, 2, 4, 3, 5],
  );
});

test('a stale completion toast cannot undo a newer operation', () => {
  const first = beginCompletionOperation('task:17');
  assert.equal(isCurrentCompletionOperation('task:17', first), true);
  const second = beginCompletionOperation('task:17');
  assert.equal(isCurrentCompletionOperation('task:17', first), false);
  assert.equal(isCurrentCompletionOperation('task:17', second), true);
});
