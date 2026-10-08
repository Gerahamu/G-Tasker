import assert from 'node:assert/strict';
import { test } from 'node:test';

const { automaticReschedulePatch } = await import('../../src/lib/daily-reminders.ts');
const { getTaskReminderAt } = await import('../../src/lib/task-reminders.ts');
const { nextRecurringTaskDate } = await import('../../src/lib/task-recurrence.ts');

function task(patch = {}) {
  return {
    id: 1,
    listId: 1,
    title: '计划任务',
    notes: '',
    priority: 'low',
    isFlagged: false,
    dueDate: '2026-09-16',
    dueTime: null,
    completedAt: null,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
    sortOrder: 1,
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

test('task reminders resolve due and start anchors without changing task data', () => {
  const due = getTaskReminderAt(
    task({ dueDate: '2026-09-17', dueTime: '10:30', reminder: { anchor: 'due', minutesBefore: 15 } }),
  );
  assert.equal(due?.getHours(), 10);
  assert.equal(due?.getMinutes(), 15);

  const start = getTaskReminderAt(
    task({
      dateStart: '2026-09-17T14:00',
      reminder: { anchor: 'start', minutesBefore: 0 },
    }),
  );
  assert.equal(start?.getHours(), 14);
  assert.equal(start?.getMinutes(), 0);
});

test('automatic rescheduling uses tomorrow or today window availability', () => {
  const now = new Date(2026, 8, 17, 10, 0);
  assert.deepEqual(
    automaticReschedulePatch(task({ reschedulePolicy: 'tomorrow' }), now),
    { dueDate: '2026-09-18' },
  );
  assert.deepEqual(
    automaticReschedulePatch(
      task({
        reschedulePolicy: 'next_available',
        timeFlexibility: 'window',
        timeWindowStart: '09:00',
        timeWindowEnd: '18:00',
      }),
      now,
    ),
    { dueDate: '2026-09-17' },
  );
});

test('recurrence produces the next occurrence and respects the end date', () => {
  assert.equal(
    nextRecurringTaskDate(task({ dueDate: '2026-09-16', repeatRule: { frequency: 'daily' } })),
    '2026-09-17',
  );
  assert.equal(
    nextRecurringTaskDate(
      task({
        dueDate: '2026-09-16',
        repeatRule: { frequency: 'weekly', weekdays: [3] },
      }),
    ),
    '2026-09-23',
  );
  assert.equal(
    nextRecurringTaskDate(
      task({
        dueDate: '2026-09-16',
        repeatRule: { frequency: 'monthly', endDate: '2026-09-20' },
      }),
    ),
    null,
  );
});
