import Dexie, { type EntityTable } from 'dexie';
import type {
  Task,
  Subtask,
  Attachment,
  Tag,
  TaskTag,
  TaskDependency,
  TaskList,
  RecurrenceRule,
  TaskTemplate,
  LocationTrigger,
  TaskDraft,
  Reminder,
  NotificationLog,
  CalendarMarker,
  Memo,
  InboxItem,
  MonthlyPlan,
  WeeklyPlan,
  DayPlan,
  TimeBlock,
  Plan,
  PlanBlock,
  TimeMark,
  Planning,
} from '../lib/types';
import type {
  ClockTimezone,
  StopwatchState,
  Countdown,
  Alarm,
  AlarmTriggerRecord,
  ClockSettings,
} from '../lib/clock-types';

// Derive a concrete ISO date range from the legacy plan-template fields
// (type + daysCount) so old plans migrate into the date-based planning model.
function derivePlanningRange(
  type: string | undefined,
  daysCount: number | undefined,
): { startDate: string; endDate: string } {
  const now = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (d: Date, n: number) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  switch (type) {
    case 'day':
      return { startDate: iso(now), endDate: iso(now) };
    case 'week': {
      const dow = now.getDay();
      const monday = addDays(now, dow === 0 ? -6 : 1 - dow);
      return { startDate: iso(monday), endDate: iso(addDays(monday, 6)) };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: iso(start), endDate: iso(end) };
    }
    default: {
      const n = Math.max(1, Number(daysCount) || 7);
      return { startDate: iso(now), endDate: iso(addDays(now, n - 1)) };
    }
  }
}

export class TaskManagerDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  subtasks!: EntityTable<Subtask, 'id'>;
  attachments!: EntityTable<Attachment, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  taskTags!: EntityTable<TaskTag, 'id'>;
  taskDependencies!: EntityTable<TaskDependency, 'id'>;
  taskLists!: EntityTable<TaskList, 'id'>;
  recurrenceRules!: EntityTable<RecurrenceRule, 'id'>;
  taskTemplates!: EntityTable<TaskTemplate, 'id'>;
  locationTriggers!: EntityTable<LocationTrigger, 'id'>;
  reminders!: EntityTable<Reminder, 'id'>;
  notificationLogs!: EntityTable<NotificationLog, 'id'>;
  calendarMarkers!: EntityTable<CalendarMarker, 'id'>;
  timeMarks!: EntityTable<TimeMark, 'id'>;
  memos!: EntityTable<Memo, 'id'>;
  inboxItems!: EntityTable<InboxItem, 'id'>;
  monthlyPlans!: EntityTable<MonthlyPlan, 'id'>;
  weeklyPlans!: EntityTable<WeeklyPlan, 'id'>;
  dayPlans!: EntityTable<DayPlan, 'id'>;
  timeBlocks!: EntityTable<TimeBlock, 'id'>;
  planTemplates!: EntityTable<Plan, 'id'>;
  planTemplateBlocks!: EntityTable<PlanBlock, 'id'>;
  plannings!: EntityTable<Planning, 'id'>;
  clockTimezones!: EntityTable<ClockTimezone, 'id'>;
  stopwatchState!: EntityTable<StopwatchState, 'id'>;
  countdowns!: EntityTable<Countdown, 'id'>;
  alarms!: EntityTable<Alarm, 'id'>;
  alarmTriggerRecords!: EntityTable<AlarmTriggerRecord, 'id'>;
  clockSettings!: EntityTable<ClockSettings, 'id'>;
  taskDrafts!: EntityTable<TaskDraft, 'id'>;

  constructor() {
    super('TaskManagerDB');
    this.version(1).stores({
      tasks:
        '++id, listId, priority, isFlagged, dueDate, dueTime, completedAt, sortOrder, parentTaskId, [listId+sortOrder], [listId+completedAt], [listId+dueDate]',
      subtasks: '++id, taskId, [taskId+sortOrder]',
      attachments: '++id, taskId',
      tags: '++id, &name',
      taskTags: '++id, taskId, tagId, [taskId+tagId]',
      taskDependencies: '++id, taskId, dependsOnTaskId',
      taskLists: '++id, sortOrder, isSmartList',
      recurrenceRules: '++id',
      taskTemplates: '++id',
      locationTriggers: '++id',
      reminders: '++id, taskId, reminderAt, isFired, [taskId+isFired]',
      notificationLogs: '++id, taskId, deliveredAt, type',
    });
    this.version(3).stores({
      tasks:
        '++id, listId, priority, isFlagged, dueDate, dueTime, completedAt, sortOrder, parentTaskId, status, [listId+sortOrder], [listId+completedAt], [listId+dueDate], [listId+status]',
      subtasks: '++id, taskId, [taskId+sortOrder]',
      attachments: '++id, taskId',
      tags: '++id, &name',
      taskTags: '++id, taskId, tagId, [taskId+tagId]',
      taskDependencies: '++id, taskId, dependsOnTaskId',
      taskLists: '++id, sortOrder, isSmartList',
      recurrenceRules: '++id',
      taskTemplates: '++id',
      locationTriggers: '++id',
      reminders: '++id, taskId, reminderAt, isFired, [taskId+isFired]',
      notificationLogs: '++id, taskId, deliveredAt, type',
      calendarMarkers: '++id, date, type, [date+type]',
    });
    this.version(4).stores({
      tasks:
        '++id, listId, priority, isFlagged, dueDate, dueTime, completedAt, sortOrder, parentTaskId, status, [listId+sortOrder], [listId+completedAt], [listId+dueDate], [listId+status]',
      subtasks: '++id, taskId, [taskId+sortOrder]',
      attachments: '++id, taskId',
      tags: '++id, &name',
      taskTags: '++id, taskId, tagId, [taskId+tagId]',
      taskDependencies: '++id, taskId, dependsOnTaskId',
      taskLists: '++id, sortOrder, isSmartList',
      recurrenceRules: '++id',
      taskTemplates: '++id',
      locationTriggers: '++id',
      reminders: '++id, taskId, reminderAt, isFired, [taskId+isFired]',
      notificationLogs: '++id, taskId, deliveredAt, type',
      calendarMarkers: '++id, date, type, [date+type]',
      memos: '++id, pinned, updatedAt, [pinned+updatedAt]',
      inboxItems: '++id, status, createdAt',
    });
    this.version(2).stores({
      tasks:
        '++id, listId, priority, isFlagged, dueDate, dueTime, completedAt, sortOrder, parentTaskId, [listId+sortOrder], [listId+completedAt], [listId+dueDate]',
      subtasks: '++id, taskId, [taskId+sortOrder]',
      attachments: '++id, taskId',
      tags: '++id, &name',
      taskTags: '++id, taskId, tagId, [taskId+tagId]',
      taskDependencies: '++id, taskId, dependsOnTaskId',
      taskLists: '++id, sortOrder, isSmartList',
      recurrenceRules: '++id',
      taskTemplates: '++id',
      locationTriggers: '++id',
      reminders: '++id, taskId, reminderAt, isFired, [taskId+isFired]',
      notificationLogs: '++id, taskId, deliveredAt, type',
      calendarMarkers: '++id, date, type, [date+type]',
    });
    this.version(4).stores({
      tasks:
        '++id, listId, priority, isFlagged, dueDate, dueTime, completedAt, sortOrder, parentTaskId, status, [listId+sortOrder], [listId+completedAt], [listId+dueDate], [listId+status]',
      subtasks: '++id, taskId, [taskId+sortOrder]',
      attachments: '++id, taskId',
      tags: '++id, &name',
      taskTags: '++id, taskId, tagId, [taskId+tagId]',
      taskDependencies: '++id, taskId, dependsOnTaskId',
      taskLists: '++id, sortOrder, isSmartList',
      recurrenceRules: '++id',
      taskTemplates: '++id',
      locationTriggers: '++id',
      reminders: '++id, taskId, reminderAt, isFired, [taskId+isFired]',
      notificationLogs: '++id, taskId, deliveredAt, type',
      calendarMarkers: '++id, date, type, [date+type]',
      memos: '++id, pinned, updatedAt, [pinned+updatedAt]',
      inboxItems: '++id, status, createdAt',
    });
    this.version(5).stores({
      tasks:
        '++id, listId, priority, isFlagged, dueDate, dueTime, completedAt, sortOrder, parentTaskId, status, [listId+sortOrder], [listId+completedAt], [listId+dueDate], [listId+status]',
      subtasks: '++id, taskId, [taskId+sortOrder]',
      attachments: '++id, taskId',
      tags: '++id, &name',
      taskTags: '++id, taskId, tagId, [taskId+tagId]',
      taskDependencies: '++id, taskId, dependsOnTaskId',
      taskLists: '++id, sortOrder, isSmartList',
      recurrenceRules: '++id',
      taskTemplates: '++id',
      locationTriggers: '++id',
      reminders: '++id, taskId, reminderAt, isFired, [taskId+isFired]',
      notificationLogs: '++id, taskId, deliveredAt, type',
      calendarMarkers: '++id, date, type, [date+type]',
      memos: '++id, pinned, updatedAt, [pinned+updatedAt]',
      inboxItems: '++id, status, createdAt',
      monthlyPlans: '++id, month',
      weeklyPlans: '++id, monthlyPlanId',
      dayPlans: '++id, weeklyPlanId, date',
      timeBlocks: '++id, dayPlanId, sortOrder',
    });
    this.version(10).stores({
      tasks:
        '++id, listId, priority, isFlagged, dueDate, dueTime, completedAt, sortOrder, parentTaskId, status, [listId+sortOrder], [listId+completedAt], [listId+dueDate], [listId+status]',
      subtasks: '++id, taskId, [taskId+sortOrder]',
      attachments: '++id, taskId',
      tags: '++id, &name',
      taskTags: '++id, taskId, tagId, [taskId+tagId]',
      taskDependencies: '++id, taskId, dependsOnTaskId',
      taskLists: '++id, sortOrder, isSmartList',
      recurrenceRules: '++id',
      taskTemplates: '++id',
      locationTriggers: '++id',
      reminders: '++id, taskId, reminderAt, isFired, [taskId+isFired]',
      notificationLogs: '++id, taskId, deliveredAt, type',
      calendarMarkers: '++id, date, type, [date+type]',
      memos: '++id, pinned, updatedAt, [pinned+updatedAt]',
      inboxItems: '++id, status, createdAt',
      monthlyPlans: '++id, month',
      weeklyPlans: '++id, monthlyPlanId',
      dayPlans: '++id, weeklyPlanId, date',
      timeBlocks: '++id, dayPlanId, sortOrder',
      planTemplates: '++id, type, createdAt',
      planTemplateBlocks: '++id, planId, dayIndex, sortOrder, [planId+dayIndex]',
    });
    this.version(11).stores({
      tasks:
        '++id, listId, priority, isFlagged, dueDate, dueTime, completedAt, sortOrder, parentTaskId, status, [listId+sortOrder], [listId+completedAt], [listId+dueDate], [listId+status]',
      subtasks: '++id, taskId, [taskId+sortOrder]',
      attachments: '++id, taskId',
      tags: '++id, &name',
      taskTags: '++id, taskId, tagId, [taskId+tagId]',
      taskDependencies: '++id, taskId, dependsOnTaskId',
      taskLists: '++id, sortOrder, isSmartList',
      recurrenceRules: '++id',
      taskTemplates: '++id',
      locationTriggers: '++id',
      reminders: '++id, taskId, reminderAt, isFired, [taskId+isFired]',
      notificationLogs: '++id, taskId, deliveredAt, type',
      calendarMarkers: '++id, date, type, [date+type]',
      memos: '++id, pinned, updatedAt, [pinned+updatedAt]',
      inboxItems: '++id, status, createdAt',
      monthlyPlans: '++id, month',
      weeklyPlans: '++id, monthlyPlanId',
      dayPlans: '++id, weeklyPlanId, date',
      timeBlocks: '++id, dayPlanId, sortOrder',
      planTemplates: '++id, type, createdAt',
      planTemplateBlocks: '++id, planId, dayIndex, sortOrder, [planId+dayIndex]',
      clockTimezones: '++id, timezone, order, [order]',
      stopwatchState: '++id',
      countdowns: '++id, status, createdAt',
      alarms: '++id, enabled, [enabled]',
      alarmTriggerRecords: '++id, alarmId, [alarmId]',
      clockSettings: '++id',
    });
    this.version(12).stores({
      tasks:
        '++id, listId, priority, isFlagged, dueDate, dueTime, completedAt, sortOrder, parentTaskId, status, [listId+sortOrder], [listId+completedAt], [listId+dueDate], [listId+status]',
      subtasks: '++id, taskId, [taskId+sortOrder]',
      attachments: '++id, taskId',
      tags: '++id, &name',
      taskTags: '++id, taskId, tagId, [taskId+tagId]',
      taskDependencies: '++id, taskId, dependsOnTaskId',
      taskLists: '++id, sortOrder, isSmartList',
      recurrenceRules: '++id',
      taskTemplates: '++id',
      locationTriggers: '++id',
      reminders: '++id, taskId, reminderAt, isFired, [taskId+isFired]',
      notificationLogs: '++id, taskId, deliveredAt, type',
      calendarMarkers: '++id, date, type, [date+type]',
      memos: '++id, pinned, updatedAt, [pinned+updatedAt]',
      inboxItems: '++id, status, createdAt',
      monthlyPlans: '++id, month',
      weeklyPlans: '++id, monthlyPlanId',
      dayPlans: '++id, weeklyPlanId, date',
      timeBlocks: '++id, dayPlanId, sortOrder',
      planTemplates: '++id, type, createdAt',
      planTemplateBlocks: '++id, planId, dayIndex, sortOrder, [planId+dayIndex]',
      clockTimezones: '++id, timezone, order, [order]',
      stopwatchState: '++id',
      countdowns: '++id, status, createdAt',
      alarms: '++id, enabled, [enabled]',
      alarmTriggerRecords: '++id, alarmId, [alarmId]',
      clockSettings: '++id',
      timeMarks: '++id, startDate, endDate, title',
    });
    this.version(13).stores({
      taskDrafts: '++id, updatedAt, createdAt, title, &legacyTaskId',
    });
    this.version(14)
      .stores({
        plannings: '++id, periodType, startDate, endDate, createdAt',
      })
      .upgrade(async (tx) => {
        // Migrate legacy plan templates (the old "planning" feature) into the
        // new planning model. Old records are name/goal/note + a day count with
        // no real date binding, so we derive a concrete range from today.
        const legacy: Array<{
          name?: string;
          goal?: string;
          note?: string;
          type?: string;
          daysCount?: number;
          createdAt?: string;
        }> = await tx.table('planTemplates').toArray();
        for (const row of legacy) {
          const range = derivePlanningRange(row.type, row.daysCount);
          await tx.table('plannings').add({
            title: row.name ?? '',
            goal: row.goal ?? '',
            note: row.note ?? '',
            periodType: (row.type ?? 'custom') as Planning['periodType'],
            startDate: range.startDate,
            endDate: range.endDate,
            taskIds: [],
            milestones: [],
            lanes: [],
            createdAt: row.createdAt ?? new Date().toISOString(),
            updatedAt: row.createdAt ?? new Date().toISOString(),
          });
        }
      });
  }
}

export const db = new TaskManagerDB();
