import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import process from 'node:process';
import { after, beforeEach, test } from 'node:test';

const { db } = await import('../../src/db/database.ts');
const { getDueDateStatus } = await import('../../src/lib/format-date.ts');
const { useTaskStore } = await import('../../src/stores/task-store.ts');
const { useListStore } = await import('../../src/stores/list-store.ts');
const { usePlanStore } = await import('../../src/stores/plan-store.ts');
const { useUIStore } = await import('../../src/stores/ui-store.ts');
const { createTaskRecord, ensureDefaultList } = await import('../../src/db/task-operations.ts');
const { clearAllBusinessData } = await import('../../src/db/maintenance.ts');
const { calendarDayDifference, normalizeTaskDates, TaskDateValidationError } =
  await import('../../src/lib/task-dates.ts');
const { generateCalendarMonth } = await import('../../src/lib/calendar-utils.ts');

beforeEach(async () => {
  useTaskStore.setState({ tasks: [], dirtyIds: new Set() });
  useListStore.setState({ lists: [], dirtyIds: new Set() });
  usePlanStore.setState({ plannings: [] });
  useUIStore.setState({ showCreateModal: false, presetListId: null });
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
});

after(() => db.close());

async function seedTask(id = 1, listId = 1) {
  const task = {
    id,
    listId,
    title: `task-${id}`,
    notes: '',
    priority: 'medium',
    isFlagged: false,
    dueDate: null,
    dueTime: null,
    completedAt: null,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
    sortOrder: id,
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
  await db.tasks.add(task);
  useTaskStore.setState((state) => ({ tasks: [...state.tasks, task] }));
  return task;
}

test('task deletion removes every owned task relation but preserves shared tags', async () => {
  await seedTask();
  await seedTask(2, 2);
  await seedTask(3, 1);
  await db.tasks.update(1, { recurrenceRuleId: 1, locationTriggerId: 1 });
  await db.tasks.update(2, { recurrenceRuleId: 1, locationTriggerId: 2 });
  await db.tasks.update(3, { parentTaskId: 1, recurrenceRuleId: 2 });
  await db.tags.add({ id: 1, name: 'shared', color: '#000000' });
  await db.recurrenceRules.bulkAdd([{ id: 1 }, { id: 2 }]);
  await db.locationTriggers.bulkAdd([{ id: 1 }, { id: 2 }]);
  await Promise.all([
    db.subtasks.add({ taskId: 1, title: 'subtask', sortOrder: 0 }),
    db.attachments.add({ taskId: 1, fileName: 'file' }),
    db.taskTags.add({ taskId: 1, tagId: 1 }),
    db.taskDependencies.add({ taskId: 1, dependsOnTaskId: 2 }),
    db.reminders.add({ taskId: 1, reminderAt: '2026-09-11' }),
    db.notificationLogs.add({ taskId: 1, title: 'notice' }),
  ]);

  await useTaskStore.getState().deleteTask(1);

  assert.equal(await db.tasks.count(), 1);
  assert.ok(await db.tasks.get(2));
  assert.equal(await db.subtasks.count(), 0);
  assert.equal(await db.attachments.count(), 0);
  assert.equal(await db.taskTags.count(), 0);
  assert.equal(await db.taskDependencies.count(), 0);
  assert.equal(await db.reminders.count(), 0);
  assert.equal(await db.notificationLogs.count(), 0);
  assert.equal(await db.tags.count(), 1);
  assert.ok(await db.recurrenceRules.get(1));
  assert.equal(await db.recurrenceRules.get(2), undefined);
  assert.equal(await db.locationTriggers.get(1), undefined);
  assert.ok(await db.locationTriggers.get(2));
});

test('list deletion cascades through task-owned relations', async () => {
  await db.taskLists.add({ id: 1, name: 'list', sortOrder: 1 });
  await seedTask(1, 1);
  await db.attachments.add({ taskId: 1, fileName: 'file' });
  await db.reminders.add({ taskId: 1, reminderAt: '2026-09-11' });

  await useListStore.getState().deleteList(1);

  assert.equal(await db.taskLists.count(), 0);
  assert.equal(await db.tasks.count(), 0);
  assert.equal(await db.attachments.count(), 0);
  assert.equal(await db.reminders.count(), 0);
});

test('concurrent List creation returns one canonical record', async () => {
  const input = {
    name: 'Concurrent',
    color: '#3b82f6',
    icon: 'List',
    isSmartList: false,
    filterConfig: null,
  };
  const ids = await Promise.all([
    useListStore.getState().addList(input),
    useListStore.getState().addList(input),
  ]);
  assert.equal(new Set(ids).size, 1);
  assert.equal(await db.taskLists.filter((list) => list.name === 'Concurrent').count(), 1);
});

test('the DST-short day ends at the next local midnight, not 24 hours later', () => {
  const RealDate = globalThis.Date;
  process.env.TZ = 'America/New_York';
  class FakeDate extends RealDate {
    constructor(...args) {
      super(...(args.length === 0 ? ['2026-03-08T23:30:00-04:00'] : args));
    }
    static now() {
      return new RealDate('2026-03-08T23:30:00-04:00').getTime();
    }
  }
  globalThis.Date = FakeDate;
  try {
    assert.equal(getDueDateStatus('2026-03-09', '00:30'), 'upcoming');
  } finally {
    globalThis.Date = RealDate;
    process.env.TZ = 'Asia/Shanghai';
  }
});

test('default-list reconciliation migrates tasks before removing duplicate lists', async () => {
  await db.taskLists.bulkAdd([
    { id: 10, name: '默认列表', sortOrder: 2 },
    { id: 4, name: '默认列表', sortOrder: 1 },
  ]);
  await seedTask(1, 10);
  await seedTask(2, 4);

  const canonicalId = await ensureDefaultList();
  const defaults = await db.taskLists.filter((list) => list.name === '默认列表').toArray();
  assert.equal(canonicalId, 4);
  assert.equal(defaults.length, 1);
  assert.deepEqual(
    (await db.tasks.toArray()).map((task) => task.listId),
    [4, 4],
  );
});

test('default-list migration fully rolls back when task migration fails', async () => {
  await db.taskLists.bulkAdd([
    { id: 1, name: '默认列表', sortOrder: 1 },
    { id: 2, name: '默认列表', sortOrder: 2 },
  ]);
  await seedTask(1, 2);
  const hook = () => {
    throw new Error('migration failure');
  };
  db.tasks.hook('updating', hook);
  try {
    await assert.rejects(ensureDefaultList(), /migration failure/);
  } finally {
    db.tasks.hook('updating').unsubscribe(hook);
  }
  assert.equal(await db.taskLists.count(), 2);
  assert.equal((await db.tasks.get(1)).listId, 2);
});

test('concurrent first-run initialization creates one default list', async () => {
  const ids = await Promise.all([ensureDefaultList(), ensureDefaultList()]);
  assert.equal(new Set(ids).size, 1);
  assert.equal(await db.taskLists.count(), 1);
});

test('task and subtasks are created together', async () => {
  const input = {
    listId: 1,
    title: 'atomic',
    notes: '',
    priority: 'medium',
    isFlagged: false,
    dueDate: null,
    dueTime: null,
    completedAt: null,
    recurrenceRuleId: null,
    parentTaskId: null,
    locationTriggerId: null,
    templateId: null,
    dateMode: 'simple',
    dateStart: null,
    dateEnd: null,
    dateTarget: null,
    milestones: '[]',
    status: 'active',
  };
  const created = await createTaskRecord(input, { subtaskTitles: ['child'] });
  assert.ok(created.id);
  assert.equal(await db.tasks.count(), 1);
  assert.equal(await db.subtasks.count(), 1);
});

test('Clear All covers the live Dexie table registry', async () => {
  for (const table of db.tables) await table.add({});
  await clearAllBusinessData();
  for (const table of db.tables) assert.equal(await table.count(), 0, table.name);
});

test('Clear All rolls back earlier clears when a later table fails', async () => {
  await db.tasks.add({ id: 1, title: 'keep' });
  await db.tags.add({ id: 1, name: 'keep', color: '#111111' });
  const tablePrototype = Object.getPrototypeOf(db.tags);
  const clear = tablePrototype.clear;
  tablePrototype.clear = function (...args) {
    if (this.name === 'tags') throw new Error('clear failure');
    return clear.apply(this, args);
  };
  try {
    await assert.rejects(clearAllBusinessData(), /clear failure/);
  } finally {
    tablePrototype.clear = clear;
  }
  assert.equal(await db.tasks.count(), 1);
  assert.equal(await db.tags.count(), 1);
});

test('planning deletion rolls back the plan on failure', async () => {
  const plan = {
    id: 1,
    title: 'plan',
    goal: '',
    note: '',
    periodType: 'custom',
    startDate: '2026-09-10',
    endDate: '2026-09-10',
    taskIds: [],
    milestones: [],
    lanes: [],
    createdAt: '2026-09-10',
    updatedAt: '2026-09-10',
  };
  await db.plannings.add(plan);
  usePlanStore.setState({ plannings: [plan] });
  const hook = () => {
    throw new Error('plan delete failure');
  };
  db.plannings.hook('deleting', hook);
  try {
    await assert.rejects(usePlanStore.getState().deletePlanning(1), /plan delete failure/);
  } finally {
    db.plannings.hook('deleting').unsubscribe(hook);
  }
  assert.equal(await db.plannings.count(), 1);
  assert.equal(usePlanStore.getState().plannings.length, 1);
});

test('date normalization clears hidden fields and rejects reversed ranges', () => {
  assert.deepEqual(
    normalizeTaskDates({
      dateMode: 'simple',
      dueDate: null,
      dueTime: '09:30',
      dateStart: '2026-09-10T08:00',
      dateEnd: '2026-09-10T10:00',
    }),
    { dateMode: 'simple', dueDate: null, dueTime: null, dateStart: null, dateEnd: null },
  );
  assert.throws(
    () =>
      normalizeTaskDates({
        dateMode: 'advanced',
        dateStart: '2026-09-10T10:01',
        dateEnd: '2026-09-10T10:00',
      }),
    TaskDateValidationError,
  );
  assert.deepEqual(
    normalizeTaskDates({
      dateMode: 'advanced',
      dateStart: '2026-09-10T10:00',
      dateEnd: '2026-09-10T10:00',
    }),
    {
      dateMode: 'advanced',
      dueDate: '2026-09-10',
      dueTime: '10:00',
      dateStart: '2026-09-10T10:00',
      dateEnd: '2026-09-10T10:00',
    },
  );
  assert.equal(calendarDayDifference('2026-03-08', '2026-03-09'), 1);
  assert.equal(calendarDayDifference('2026-11-01', '2026-11-02'), 1);
  assert.equal(calendarDayDifference('2026-12-31', '2027-01-01'), 1);
  assert.equal(calendarDayDifference('2028-02-28', '2028-03-01'), 2);
});

test('closing the create modal consumes its one-shot list preset', () => {
  useUIStore.getState().setPresetListId(42);
  useUIStore.getState().setShowCreateModal(true);
  useUIStore.getState().setShowCreateModal(false);
  assert.equal(useUIStore.getState().presetListId, null);
});

test('calendar month generation does not append an extra full week when month ends on Saturday', () => {
  // October 2026 ends on Saturday Oct 31
  const octWeeks = generateCalendarMonth(2026, 10, 'solar', new Set(['CN']), () => [], []);
  assert.equal(octWeeks.length, 5);
  const lastWeek = octWeeks[octWeeks.length - 1];
  assert.equal(lastWeek[6].dateKey, '2026-10-31');

  // February 2026 starts on Sunday Feb 1 and ends on Saturday Feb 28
  const febWeeks = generateCalendarMonth(2026, 2, 'solar', new Set(['CN']), () => [], []);
  assert.equal(febWeeks.length, 4);
  const febLastWeek = febWeeks[febWeeks.length - 1];
  assert.equal(febLastWeek[6].dateKey, '2026-02-28');

  // November 2026 ends on Monday Nov 30 (should pad until Saturday Dec 5)
  const novWeeks = generateCalendarMonth(2026, 11, 'solar', new Set(['CN']), () => [], []);
  assert.equal(novWeeks.length, 5);
  const novLastWeek = novWeeks[novWeeks.length - 1];
  assert.equal(novLastWeek[1].dateKey, '2026-11-30');
  assert.equal(novLastWeek[6].dateKey, '2026-12-05');
});
