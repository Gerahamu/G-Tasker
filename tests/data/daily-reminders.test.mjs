import assert from 'node:assert/strict';
import { test } from 'node:test';

const {
  DEFAULT_DAILY_REMINDER_SETTINGS,
  MORNING_CUTOFF_TIME,
  buildDailyReminderSummary,
  canSnoozeMorning,
  claimDailyReminder,
  dismissDailyReminderSlot,
  evaluateAndSyncDailyReminders,
  getDailyReminderCandidate,
  readDailyReminderSettings,
  readDailyReminderState,
  readNotificationMasterEnabled,
  readNotificationSoundEnabled,
  readOverdueReminderEnabled,
  saveDailyReminderSettings,
  snoozeMorningReminder,
  taskDateMovePatch,
} = await import('../../src/lib/daily-reminders.ts');

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

function task(id, patch = {}) {
  return {
    id,
    listId: 1,
    title: `task-${id}`,
    notes: '',
    priority: 'medium',
    isFlagged: false,
    dueDate: '2026-09-16',
    dueTime: null,
    completedAt: null,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
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
    ...patch,
  };
}

test('daily reminder settings keep safe defaults and persist customized times', () => {
  const storage = new MemoryStorage();
  assert.deepEqual(readDailyReminderSettings(storage), DEFAULT_DAILY_REMINDER_SETTINGS);
  saveDailyReminderSettings(
    {
      ...DEFAULT_DAILY_REMINDER_SETTINGS,
      morningEnabled: false,
      morningTime: '07:25',
      eveningTime: '22:10',
      weekendEnabled: false,
      showWhenNoTasks: true,
    },
    storage,
  );
  assert.deepEqual(readDailyReminderSettings(storage), {
    morningEnabled: false,
    morningTime: '07:25',
    eveningEnabled: true,
    eveningTime: '22:10',
    weekendEnabled: false,
    showWhenNoTasks: true,
  });
  assert.equal(readNotificationMasterEnabled(storage), true);
  storage.setItem('notify-enabled', 'false');
  assert.equal(readNotificationMasterEnabled(storage), false);
});

test('notification sound and overdue reminder switches are read from persisted settings', () => {
  const storage = new MemoryStorage();
  assert.equal(readNotificationSoundEnabled(storage), true);
  assert.equal(readOverdueReminderEnabled(storage), true);
  storage.setItem('notify-sound', 'false');
  storage.setItem('notify-overdue', 'false');
  assert.equal(readNotificationSoundEnabled(storage), false);
  assert.equal(readOverdueReminderEnabled(storage), false);
});

test('scheduled reminders are claimed before display and only appear once per day', () => {
  const storage = new MemoryStorage();
  const morning = new Date(2026, 8, 16, 8, 1);
  const settings = { ...DEFAULT_DAILY_REMINDER_SETTINGS };
  const state = readDailyReminderState(storage);

  assert.equal(getDailyReminderCandidate(morning, settings, state, false), null);
  const candidate = getDailyReminderCandidate(morning, settings, state, true);
  assert.deepEqual(candidate, { kind: 'morning', source: 'scheduled' });
  claimDailyReminder(candidate, morning, storage);
  assert.equal(readDailyReminderState(storage).morningLastShownDate, '2026-09-16');
  assert.equal(
    getDailyReminderCandidate(morning, settings, readDailyReminderState(storage), true),
    null,
  );

  const evening = new Date(2026, 8, 16, 21, 5);
  assert.deepEqual(
    getDailyReminderCandidate(evening, settings, readDailyReminderState(storage), true),
    { kind: 'evening', source: 'scheduled' },
  );
});

test('weekend setting blocks both reminders', () => {
  const storage = new MemoryStorage();
  const saturday = new Date(2026, 8, 19, 22, 0);
  const settings = { ...DEFAULT_DAILY_REMINDER_SETTINGS, weekendEnabled: false };
  assert.equal(
    getDailyReminderCandidate(saturday, settings, readDailyReminderState(storage), true),
    null,
  );
});

test('morning snooze produces one delayed reminder and cannot loop', () => {
  const storage = new MemoryStorage();
  const shownAt = new Date(2026, 8, 16, 8, 5);
  const scheduled = { kind: 'morning', source: 'scheduled' };
  claimDailyReminder(scheduled, shownAt, storage);
  const snoozed = snoozeMorningReminder(shownAt, storage, 30);
  assert.equal(canSnoozeMorning(shownAt, snoozed), false);
  assert.equal(
    getDailyReminderCandidate(
      new Date(2026, 8, 16, 8, 34),
      DEFAULT_DAILY_REMINDER_SETTINGS,
      snoozed,
      true,
    ),
    null,
  );
  const delayedAt = new Date(2026, 8, 16, 8, 35);
  const delayed = getDailyReminderCandidate(
    delayedAt,
    DEFAULT_DAILY_REMINDER_SETTINGS,
    snoozed,
    true,
  );
  assert.deepEqual(delayed, { kind: 'morning', source: 'snoozed' });
  claimDailyReminder(delayed, delayedAt, storage);
  assert.equal(
    getDailyReminderCandidate(
      new Date(2026, 8, 16, 9, 30),
      DEFAULT_DAILY_REMINDER_SETTINGS,
      readDailyReminderState(storage),
      true,
    ),
    null,
  );
});

test('summary counts today, incomplete, completed and overdue tasks and sorts by start time', () => {
  const now = new Date(2026, 8, 16, 9, 30);
  const tasks = [
    task(1, { title: 'Ten', dateStart: '2026-09-16T10:00', dateMode: 'advanced' }),
    task(2, { title: 'Eight', dateStart: '2026-09-16T08:30', dateMode: 'advanced' }),
    task(3, { completedAt: '2026-09-16T01:00:00.000Z' }),
    task(4, { dueDate: '2026-09-15' }),
    task(5, { dueTime: '08:00' }),
    task(6, { status: 'draft' }),
  ];
  const summary = buildDailyReminderSummary(tasks, now);
  assert.equal(summary.todayTasks.length, 4);
  assert.equal(summary.todayIncomplete.length, 3);
  assert.equal(summary.todayCompleted.length, 1);
  assert.deepEqual(
    summary.overdueTasks.map((item) => item.id),
    [4, 5],
  );
  assert.deepEqual(
    summary.morningTasks.map((item) => item.id),
    [5, 2, 1],
  );
  assert.deepEqual(
    summary.eveningTasks.map((item) => item.id),
    [4, 5, 2, 1],
  );
});

test('summary excludes overdue tasks when overdue reminders are disabled', () => {
  const summary = buildDailyReminderSummary(
    [task(1, { dueDate: '2026-09-15', title: 'overdue' })],
    new Date(2026, 8, 16, 9, 30),
    { includeOverdue: false },
  );
  assert.deepEqual(summary.overdueTasks, []);
  assert.deepEqual(summary.eveningTasks, []);
});

test('date quick actions preserve advanced ranges and simple task semantics', () => {
  assert.deepEqual(taskDateMovePatch(task(1), '2026-09-17'), { dueDate: '2026-09-17' });
  const advanced = task(2, {
    dateMode: 'advanced',
    dueDate: '2026-09-16',
    dueTime: '17:00',
    dateStart: '2026-09-14T09:00',
    dateEnd: '2026-09-16T17:00',
  });
  assert.deepEqual(taskDateMovePatch(advanced, '2026-09-17'), {
    dateStart: '2026-09-15T09:00',
    dateEnd: '2026-09-17T17:00',
    dueDate: '2026-09-17',
    dueTime: '17:00',
  });
});

test('morning reminder is strictly suppressed once time reaches 11:00', () => {
  const storage = new MemoryStorage();
  const settings = { ...DEFAULT_DAILY_REMINDER_SETTINGS };
  const state = readDailyReminderState(storage);
  assert.equal(MORNING_CUTOFF_TIME, '11:00');

  const beforeCutoff = new Date(2026, 8, 16, 10, 59);
  assert.deepEqual(getDailyReminderCandidate(beforeCutoff, settings, state, true), {
    kind: 'morning',
    source: 'scheduled',
  });

  const atCutoff = new Date(2026, 8, 16, 11, 0);
  assert.equal(getDailyReminderCandidate(atCutoff, settings, state, true), null);
  assert.equal(canSnoozeMorning(atCutoff, state), false);

  dismissDailyReminderSlot('morning', atCutoff, storage);
  assert.equal(readDailyReminderState(storage).morningLastCheckedDate, '2026-09-16');

  const afterCutoff = new Date(2026, 8, 16, 14, 30);
  assert.equal(getDailyReminderCandidate(afterCutoff, settings, state, true), null);

  // Even if a morning reminder was previously snoozed, it cannot pop up at or after 11:00
  const snoozeState = {
    ...state,
    morningSnoozeDate: '2026-09-16',
    morningSnoozeUntil: '2026-09-16T11:05:00.000Z',
    morningSnoozeShownDate: null,
  };
  const snoozedAtCutoff = new Date(2026, 8, 16, 11, 5);
  assert.equal(getDailyReminderCandidate(snoozedAtCutoff, settings, snoozeState, true), null);
});

test('scheduled evaluation with no tasks suppresses reminder for the slot and prevents reactive popups on later task creation', () => {
  const storage = new MemoryStorage();
  const settings = { ...DEFAULT_DAILY_REMINDER_SETTINGS, showWhenNoTasks: false };

  // 1. Morning check at 08:00 with 0 tasks
  const morningScheduledTime = new Date(2026, 8, 16, 8, 0);
  const morningResult = evaluateAndSyncDailyReminders(
    morningScheduledTime,
    settings,
    false,
    storage,
  );
  assert.equal(morningResult, null);
  assert.equal(readDailyReminderState(storage).morningLastCheckedDate, '2026-09-16');
  assert.equal(readDailyReminderState(storage).morningLastShownDate, null);

  // User creates a task at 08:30 -> evaluation must NOT trigger the morning reminder!
  const taskCreatedTime = new Date(2026, 8, 16, 8, 30);
  const reactiveMorningAttempt = evaluateAndSyncDailyReminders(
    taskCreatedTime,
    settings,
    true,
    storage,
  );
  assert.equal(reactiveMorningAttempt, null);

  // 2. Evening check at 21:00 with 0 tasks
  const eveningScheduledTime = new Date(2026, 8, 16, 21, 0);
  const eveningResult = evaluateAndSyncDailyReminders(
    eveningScheduledTime,
    settings,
    false,
    storage,
  );
  assert.equal(eveningResult, null);
  assert.equal(readDailyReminderState(storage).eveningLastCheckedDate, '2026-09-16');
  assert.equal(readDailyReminderState(storage).eveningLastShownDate, null);

  // User creates a task at 21:15 -> evaluation must NOT trigger the evening reminder!
  const taskCreatedEveningTime = new Date(2026, 8, 16, 21, 15);
  const reactiveEveningAttempt = evaluateAndSyncDailyReminders(
    taskCreatedEveningTime,
    settings,
    true,
    storage,
  );
  assert.equal(reactiveEveningAttempt, null);
});
