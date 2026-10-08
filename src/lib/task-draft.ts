import type {
  Priority,
  RepeatFrequency,
  RepeatUnit,
  ReschedulePolicy,
  Task,
  TaskCreationData,
  TaskFormSnapshot,
  TimeFlexibility,
} from './types';
import { normalizeTaskDates } from './task-dates';

export type TaskReminderMode =
  'none' | 'start' | '5' | '10' | '30' | 'due' | 'due_before' | 'custom';

export class TaskFormValidationError extends Error {}

const TASK_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function positiveInteger(value: number | '', field: string): number | null {
  if (value === '') return null;
  if (!Number.isFinite(value) || value < 1) {
    throw new TaskFormValidationError(`${field} must be a positive number`);
  }
  return Math.floor(value);
}

function validateTimeWindow(start: string, end: string) {
  if (!TASK_TIME_PATTERN.test(start) || !TASK_TIME_PATTERN.test(end) || start >= end) {
    throw new TaskFormValidationError('The scheduling window must have a valid start and end');
  }
}

export interface CreateTaskFormState {
  title: string;
  priority: Priority;
  isFlagged: boolean;
  listId: number;
  notes: string;
  dueDate: string;
  dueTime: string;
  showMoreSettings: boolean;
  showPreciseTime: boolean;
  dateStart: string;
  dateStartTime: string;
  showDueTime: boolean;
  durationMinutes: number | '';
  repeatFrequency: RepeatFrequency;
  repeatInterval: number;
  repeatUnit: RepeatUnit;
  repeatWeekdays: number[];
  repeatEndDate: string;
  reminderMode: TaskReminderMode;
  customReminderMinutes: number | '';
  timeFlexibility: TimeFlexibility;
  timeWindowStart: string;
  timeWindowEnd: string;
  reschedulePolicy: ReschedulePolicy;
  timeBlockLocked: boolean;
  showSubtasks: boolean;
  subtaskTitles: string[];
}

export function createDefaultTaskFormState({
  listId,
  dueDate,
  defaultReminderMinutes = null,
}: {
  listId: number;
  dueDate: string;
  defaultReminderMinutes?: number | null;
}): CreateTaskFormState {
  const reminderMinutes =
    defaultReminderMinutes !== null &&
    Number.isFinite(defaultReminderMinutes) &&
    defaultReminderMinutes > 0
      ? Math.floor(defaultReminderMinutes)
      : '';
  return {
    title: '',
    priority: 'low',
    isFlagged: false,
    listId,
    notes: '',
    dueDate,
    dueTime: '',
    showMoreSettings: false,
    showPreciseTime: false,
    dateStart: '',
    dateStartTime: '',
    showDueTime: false,
    durationMinutes: '',
    repeatFrequency: 'none',
    repeatInterval: 1,
    repeatUnit: 'week',
    repeatWeekdays: [],
    repeatEndDate: '',
    reminderMode: dueDate && reminderMinutes ? 'due_before' : 'none',
    customReminderMinutes: reminderMinutes,
    timeFlexibility: 'anytime',
    timeWindowStart: '',
    timeWindowEnd: '',
    reschedulePolicy: 'overdue',
    timeBlockLocked: false,
    showSubtasks: true,
    subtaskTitles: [],
  };
}

export function captureTaskFormSnapshot(
  form: CreateTaskFormState,
  fallbackListId: number,
): TaskFormSnapshot {
  const submittedDueTime = form.showPreciseTime || form.showDueTime ? form.dueTime : null;
  const dates = normalizeTaskDates({
    dateMode: form.showPreciseTime ? 'advanced' : 'simple',
    dueDate: form.dueDate,
    dueTime: submittedDueTime,
    dateStart:
      form.showPreciseTime && form.dateStart
        ? `${form.dateStart}${form.dateStartTime ? `T${form.dateStartTime}` : ''}`
        : null,
    dateEnd:
      form.showPreciseTime && form.dueDate
        ? `${form.dueDate}${form.dueTime ? `T${form.dueTime}` : ''}`
        : null,
  });
  const scheduleAnchorDate = dates.dateStart?.slice(0, 10) ?? dates.dueDate;
  const durationMinutes =
    form.showPreciseTime || form.timeFlexibility === 'window'
      ? positiveInteger(form.durationMinutes, 'Duration')
      : null;
  const repeating = form.repeatFrequency !== 'none';
  if (repeating && !scheduleAnchorDate) {
    throw new TaskFormValidationError('A repeating task requires a date');
  }
  let repeatEndDate: string | null = null;
  if (repeating && form.repeatEndDate) {
    repeatEndDate = normalizeTaskDates({
      dateMode: 'simple',
      dueDate: form.repeatEndDate,
    }).dueDate;
    if (scheduleAnchorDate && repeatEndDate && repeatEndDate < scheduleAnchorDate) {
      throw new TaskFormValidationError('The repeat end date cannot be before the task date');
    }
  }
  const repeatInterval =
    form.repeatFrequency === 'custom'
      ? (positiveInteger(form.repeatInterval, 'Repeat interval') ?? 1)
      : 1;
  const repeatWeekdays = [...new Set(form.repeatWeekdays)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((left, right) => left - right);

  const startReminder = ['start', '5', '10', '30', 'custom'].includes(form.reminderMode);
  if (startReminder && !dates.dateStart?.includes('T')) {
    throw new TaskFormValidationError('A start reminder requires a precise start time');
  }
  if ((form.reminderMode === 'due' || form.reminderMode === 'due_before') && !dates.dueDate) {
    throw new TaskFormValidationError('A due reminder requires a due date');
  }
  const customReminderMinutes =
    form.reminderMode === 'custom' || form.reminderMode === 'due_before'
      ? positiveInteger(form.customReminderMinutes, 'Reminder')
      : null;

  if (form.timeFlexibility === 'window') {
    validateTimeWindow(form.timeWindowStart, form.timeWindowEnd);
    if (!scheduleAnchorDate) {
      throw new TaskFormValidationError('A scheduling window requires a task date');
    }
  }
  if (
    form.timeFlexibility === 'fixed' &&
    (!dates.dateStart?.includes('T') || !dates.dateEnd?.includes('T'))
  ) {
    throw new TaskFormValidationError('A fixed task requires a precise start and end time');
  }
  if (form.reschedulePolicy !== 'overdue' && !dates.dueDate) {
    throw new TaskFormValidationError('Automatic rescheduling requires a due date');
  }
  const task: TaskCreationData = {
    listId: form.listId || fallbackListId,
    title: form.title.trim(),
    notes: form.notes,
    priority: form.priority,
    isFlagged: form.isFlagged,
    ...dates,
    recurrenceRuleId: null,
    parentTaskId: null,
    locationTriggerId: null,
    templateId: null,
    dateTarget: null,
    milestones: '[]',
    durationMinutes,
    repeatRule:
      form.repeatFrequency === 'none'
        ? null
        : {
            frequency: form.repeatFrequency,
            interval: form.repeatFrequency === 'custom' ? repeatInterval : 1,
            unit: form.repeatFrequency === 'custom' ? form.repeatUnit : undefined,
            weekdays:
              form.repeatFrequency === 'weekly' ||
              (form.repeatFrequency === 'custom' && form.repeatUnit === 'week')
                ? repeatWeekdays.length > 0
                  ? repeatWeekdays
                  : undefined
                : undefined,
            endDate: repeatEndDate,
          },
    reminder:
      form.reminderMode === 'none'
        ? null
        : form.reminderMode === 'start'
          ? { anchor: 'start', minutesBefore: 0 }
          : form.reminderMode === 'due'
            ? { anchor: 'due', minutesBefore: 0 }
            : form.reminderMode === 'due_before'
              ? { anchor: 'due', minutesBefore: customReminderMinutes! }
              : {
                  anchor: 'start',
                  minutesBefore:
                    form.reminderMode === 'custom'
                      ? customReminderMinutes!
                      : Number(form.reminderMode),
                },
    timeFlexibility: form.timeFlexibility,
    timeWindowStart: form.timeFlexibility === 'window' ? form.timeWindowStart || null : null,
    timeWindowEnd: form.timeFlexibility === 'window' ? form.timeWindowEnd || null : null,
    reschedulePolicy: form.reschedulePolicy,
    timeBlockLocked:
      form.showPreciseTime &&
      Boolean(form.dateStart && form.dateStartTime && form.dueDate && form.dueTime) &&
      form.timeBlockLocked,
  };
  return {
    task,
    subtaskTitles: form.subtaskTitles.map((title) => title.trim()).filter(Boolean),
    tagIds: [],
  };
}

function splitDateTime(value: string | null | undefined) {
  if (!value) return { date: '', time: '' };
  const [date = '', time = ''] = value.split('T');
  return { date, time: time.slice(0, 5) };
}

function reminderFields(task: TaskCreationData) {
  const reminder = task.reminder;
  if (!reminder) return { reminderMode: 'none' as const, customReminderMinutes: '' as const };
  if (reminder.anchor === 'due') {
    return reminder.minutesBefore > 0
      ? {
          reminderMode: 'due_before' as const,
          customReminderMinutes: reminder.minutesBefore,
        }
      : { reminderMode: 'due' as const, customReminderMinutes: '' as const };
  }
  if (reminder.minutesBefore === 0) {
    return { reminderMode: 'start' as const, customReminderMinutes: '' as const };
  }
  if ([5, 10, 30].includes(reminder.minutesBefore)) {
    return {
      reminderMode: String(reminder.minutesBefore) as '5' | '10' | '30',
      customReminderMinutes: '' as const,
    };
  }
  return {
    reminderMode: 'custom' as const,
    customReminderMinutes: Math.max(1, reminder.minutesBefore),
  };
}

export function hydrateTaskFormSnapshot(snapshot: TaskFormSnapshot): CreateTaskFormState {
  const task = snapshot.task;
  const start = splitDateTime(task.dateStart);
  const end = splitDateTime(task.dateEnd);
  const repeat = task.repeatRule;
  const reminder = reminderFields(task);
  const showPreciseTime = task.dateMode === 'advanced';
  const dueDate = showPreciseTime ? end.date || task.dueDate || '' : task.dueDate || '';
  const dueTime = showPreciseTime ? end.time || task.dueTime || '' : task.dueTime || '';
  const hasAdvancedSettings =
    showPreciseTime ||
    Boolean(task.durationMinutes) ||
    Boolean(repeat && repeat.frequency !== 'none') ||
    Boolean(task.reminder) ||
    (task.timeFlexibility ?? 'anytime') !== 'anytime' ||
    (task.reschedulePolicy ?? 'overdue') !== 'overdue' ||
    Boolean(task.timeBlockLocked);

  return {
    title: task.title,
    priority: task.priority,
    isFlagged: task.isFlagged,
    listId: task.listId,
    notes: task.notes,
    dueDate,
    dueTime,
    showMoreSettings: hasAdvancedSettings,
    showPreciseTime,
    dateStart: start.date,
    dateStartTime: start.time,
    showDueTime: !showPreciseTime && Boolean(dueTime),
    durationMinutes: task.durationMinutes ?? '',
    repeatFrequency: repeat?.frequency ?? 'none',
    repeatInterval: repeat?.interval ?? 1,
    repeatUnit: repeat?.unit ?? 'week',
    repeatWeekdays: [...(repeat?.weekdays ?? [])],
    repeatEndDate: repeat?.endDate ?? '',
    ...reminder,
    timeFlexibility: task.timeFlexibility ?? 'anytime',
    timeWindowStart: task.timeWindowStart ?? '',
    timeWindowEnd: task.timeWindowEnd ?? '',
    reschedulePolicy: task.reschedulePolicy ?? 'overdue',
    timeBlockLocked: task.timeBlockLocked ?? false,
    showSubtasks: snapshot.subtaskTitles.length > 0,
    subtaskTitles: [...snapshot.subtaskTitles],
  };
}

export function snapshotFromLegacyTask(
  task: Task,
  subtaskTitles: string[],
  tagIds: number[],
): TaskFormSnapshot {
  const creationData = { ...task } as Partial<Task>;
  delete creationData.id;
  delete creationData.completedAt;
  delete creationData.createdAt;
  delete creationData.updatedAt;
  delete creationData.sortOrder;
  delete creationData.status;
  return {
    task: creationData as TaskCreationData,
    subtaskTitles: [...subtaskTitles],
    tagIds: [...new Set(tagIds)],
  };
}
