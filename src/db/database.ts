import Dexie, { type EntityTable } from 'dexie';
import type {
  Task, Subtask, Attachment, Tag, TaskTag, TaskDependency,
  TaskList, RecurrenceRule, TaskTemplate, LocationTrigger,
  Reminder, NotificationLog, CalendarMarker, Memo, InboxItem,
  MonthlyPlan, WeeklyPlan, DayPlan, TimeBlock, Plan, PlanBlock,
} from '../lib/types';
import type {
  ClockTimezone, StopwatchState, Countdown, Alarm,
  AlarmTriggerRecord, ClockSettings,
} from '../lib/clock-types';

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
  memos!: EntityTable<Memo, 'id'>;
  inboxItems!: EntityTable<InboxItem, 'id'>;
  monthlyPlans!: EntityTable<MonthlyPlan, 'id'>;
  weeklyPlans!: EntityTable<WeeklyPlan, 'id'>;
  dayPlans!: EntityTable<DayPlan, 'id'>;
  timeBlocks!: EntityTable<TimeBlock, 'id'>;
  planTemplates!: EntityTable<Plan, 'id'>;
  planTemplateBlocks!: EntityTable<PlanBlock, 'id'>;
  clockTimezones!: EntityTable<ClockTimezone, 'id'>;
  stopwatchState!: EntityTable<StopwatchState, 'id'>;
  countdowns!: EntityTable<Countdown, 'id'>;
  alarms!: EntityTable<Alarm, 'id'>;
  alarmTriggerRecords!: EntityTable<AlarmTriggerRecord, 'id'>;
  clockSettings!: EntityTable<ClockSettings, 'id'>;

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
      tasks: '++id, listId, priority, isFlagged, dueDate, dueTime, completedAt, sortOrder, parentTaskId, status, [listId+sortOrder], [listId+completedAt], [listId+dueDate], [listId+status]',
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
      tasks: '++id, listId, priority, isFlagged, dueDate, dueTime, completedAt, sortOrder, parentTaskId, status, [listId+sortOrder], [listId+completedAt], [listId+dueDate], [listId+status]',
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
      tasks: '++id, listId, priority, isFlagged, dueDate, dueTime, completedAt, sortOrder, parentTaskId, status, [listId+sortOrder], [listId+completedAt], [listId+dueDate], [listId+status]',
      subtasks: '++id, taskId, [taskId+sortOrder]',
      attachments: '++id, taskId',
      tags: '++id, &name',
      taskTags: '++id, taskId, tagId, [taskId+tagId]',
      taskDependencies: '++id, taskId, dependsOnTaskId',
      taskLists: '++id, sortOrder, isSmartList',
      recurrenceRules: '++id', taskTemplates: '++id', locationTriggers: '++id',
      reminders: '++id, taskId, reminderAt, isFired, [taskId+isFired]',
      notificationLogs: '++id, taskId, deliveredAt, type',
      calendarMarkers: '++id, date, type, [date+type]',
      memos: '++id, pinned, updatedAt, [pinned+updatedAt]',
      inboxItems: '++id, status, createdAt',
      monthlyPlans: '++id, month', weeklyPlans: '++id, monthlyPlanId',
      dayPlans: '++id, weeklyPlanId, date', timeBlocks: '++id, dayPlanId, sortOrder',
    });
    this.version(10).stores({
      tasks: '++id, listId, priority, isFlagged, dueDate, dueTime, completedAt, sortOrder, parentTaskId, status, [listId+sortOrder], [listId+completedAt], [listId+dueDate], [listId+status]',
      subtasks: '++id, taskId, [taskId+sortOrder]',
      attachments: '++id, taskId', tags: '++id, &name', taskTags: '++id, taskId, tagId, [taskId+tagId]',
      taskDependencies: '++id, taskId, dependsOnTaskId', taskLists: '++id, sortOrder, isSmartList',
      recurrenceRules: '++id', taskTemplates: '++id', locationTriggers: '++id',
      reminders: '++id, taskId, reminderAt, isFired, [taskId+isFired]',
      notificationLogs: '++id, taskId, deliveredAt, type',
      calendarMarkers: '++id, date, type, [date+type]',
      memos: '++id, pinned, updatedAt, [pinned+updatedAt]',
      inboxItems: '++id, status, createdAt',
      monthlyPlans: '++id, month', weeklyPlans: '++id, monthlyPlanId',
      dayPlans: '++id, weeklyPlanId, date', timeBlocks: '++id, dayPlanId, sortOrder',
      planTemplates: '++id, type, createdAt',
      planTemplateBlocks: '++id, planId, dayIndex, sortOrder, [planId+dayIndex]',
    });
    this.version(11).stores({
      tasks: '++id, listId, priority, isFlagged, dueDate, dueTime, completedAt, sortOrder, parentTaskId, status, [listId+sortOrder], [listId+completedAt], [listId+dueDate], [listId+status]',
      subtasks: '++id, taskId, [taskId+sortOrder]',
      attachments: '++id, taskId', tags: '++id, &name', taskTags: '++id, taskId, tagId, [taskId+tagId]',
      taskDependencies: '++id, taskId, dependsOnTaskId', taskLists: '++id, sortOrder, isSmartList',
      recurrenceRules: '++id', taskTemplates: '++id', locationTriggers: '++id',
      reminders: '++id, taskId, reminderAt, isFired, [taskId+isFired]',
      notificationLogs: '++id, taskId, deliveredAt, type',
      calendarMarkers: '++id, date, type, [date+type]',
      memos: '++id, pinned, updatedAt, [pinned+updatedAt]',
      inboxItems: '++id, status, createdAt',
      monthlyPlans: '++id, month', weeklyPlans: '++id, monthlyPlanId',
      dayPlans: '++id, weeklyPlanId, date', timeBlocks: '++id, dayPlanId, sortOrder',
      planTemplates: '++id, type, createdAt',
      planTemplateBlocks: '++id, planId, dayIndex, sortOrder, [planId+dayIndex]',
      clockTimezones: '++id, timezone, order, [order]',
      stopwatchState: '++id',
      countdowns: '++id, status, createdAt',
      alarms: '++id, enabled, [enabled]',
      alarmTriggerRecords: '++id, alarmId, [alarmId]',
      clockSettings: '++id',
    });
  }
}

export const db = new TaskManagerDB();
