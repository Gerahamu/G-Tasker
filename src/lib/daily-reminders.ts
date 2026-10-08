import type { Task } from './types';
import { todayISO } from './format-date';

export type DailyReminderKind = 'morning' | 'evening';
export type DailyReminderSource = 'scheduled' | 'snoozed';

export interface DailyReminderSettings {
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
  weekendEnabled: boolean;
  showWhenNoTasks: boolean;
}

export interface DailyReminderState {
  morningLastShownDate: string | null;
  eveningLastShownDate: string | null;
  morningLastCheckedDate: string | null;
  eveningLastCheckedDate: string | null;
  morningSnoozeDate: string | null;
  morningSnoozeUntil: string | null;
  morningSnoozeShownDate: string | null;
}

export interface DailyReminderCandidate {
  kind: DailyReminderKind;
  source: DailyReminderSource;
}

export interface DailyReminderSummary {
  todayTasks: Task[];
  todayIncomplete: Task[];
  todayCompleted: Task[];
  overdueTasks: Task[];
  morningTasks: Task[];
  eveningTasks: Task[];
}

export const DAILY_REMINDER_SETTINGS_KEY = 'daily-reminder-settings';
export const DAILY_REMINDER_STATE_KEY = 'daily-reminder-state';
export const DAILY_REMINDER_SETTINGS_CHANGED = 'g-tasker:daily-reminder-settings-changed';
export const MORNING_SNOOZE_MINUTES = 30;
export const MORNING_CUTOFF_TIME = '11:00';

export const DEFAULT_DAILY_REMINDER_SETTINGS: DailyReminderSettings = {
  morningEnabled: true,
  morningTime: '08:00',
  eveningEnabled: true,
  eveningTime: '21:00',
  weekendEnabled: true,
  showWhenNoTasks: false,
};

export const DEFAULT_DAILY_REMINDER_STATE: DailyReminderState = {
  morningLastShownDate: null,
  eveningLastShownDate: null,
  morningLastCheckedDate: null,
  eveningLastCheckedDate: null,
  morningSnoozeDate: null,
  morningSnoozeUntil: null,
  morningSnoozeShownDate: null,
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function readObject(storage: StorageLike, key: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? 'null');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function readDailyReminderSettings(
  storage: StorageLike = localStorage,
): DailyReminderSettings {
  const value = readObject(storage, DAILY_REMINDER_SETTINGS_KEY);
  return {
    morningEnabled:
      typeof value.morningEnabled === 'boolean'
        ? value.morningEnabled
        : DEFAULT_DAILY_REMINDER_SETTINGS.morningEnabled,
    morningTime: isTime(value.morningTime)
      ? value.morningTime
      : DEFAULT_DAILY_REMINDER_SETTINGS.morningTime,
    eveningEnabled:
      typeof value.eveningEnabled === 'boolean'
        ? value.eveningEnabled
        : DEFAULT_DAILY_REMINDER_SETTINGS.eveningEnabled,
    eveningTime: isTime(value.eveningTime)
      ? value.eveningTime
      : DEFAULT_DAILY_REMINDER_SETTINGS.eveningTime,
    weekendEnabled:
      typeof value.weekendEnabled === 'boolean'
        ? value.weekendEnabled
        : DEFAULT_DAILY_REMINDER_SETTINGS.weekendEnabled,
    showWhenNoTasks:
      typeof value.showWhenNoTasks === 'boolean'
        ? value.showWhenNoTasks
        : DEFAULT_DAILY_REMINDER_SETTINGS.showWhenNoTasks,
  };
}

export function saveDailyReminderSettings(
  settings: DailyReminderSettings,
  storage: StorageLike = localStorage,
) {
  storage.setItem(DAILY_REMINDER_SETTINGS_KEY, JSON.stringify(settings));
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event(DAILY_REMINDER_SETTINGS_CHANGED));
}

export function readNotificationMasterEnabled(storage: StorageLike = localStorage): boolean {
  try {
    const value = storage.getItem('notify-enabled');
    return value === null ? true : JSON.parse(value) !== false;
  } catch {
    return true;
  }
}

export function readNotificationSoundEnabled(storage: StorageLike = localStorage): boolean {
  try {
    const value = storage.getItem('notify-sound');
    return value === null ? true : JSON.parse(value) !== false;
  } catch {
    return true;
  }
}

export function readOverdueReminderEnabled(storage: StorageLike = localStorage): boolean {
  try {
    const value = storage.getItem('notify-overdue');
    return value === null ? true : JSON.parse(value) !== false;
  } catch {
    return true;
  }
}

export function readDailyReminderState(storage: StorageLike = localStorage): DailyReminderState {
  const value = readObject(storage, DAILY_REMINDER_STATE_KEY);
  const dateOrNull = (candidate: unknown) => (typeof candidate === 'string' ? candidate : null);
  return {
    morningLastShownDate: dateOrNull(value.morningLastShownDate),
    eveningLastShownDate: dateOrNull(value.eveningLastShownDate),
    morningLastCheckedDate: dateOrNull(value.morningLastCheckedDate),
    eveningLastCheckedDate: dateOrNull(value.eveningLastCheckedDate),
    morningSnoozeDate: dateOrNull(value.morningSnoozeDate),
    morningSnoozeUntil: dateOrNull(value.morningSnoozeUntil),
    morningSnoozeShownDate: dateOrNull(value.morningSnoozeShownDate),
  };
}

export function saveDailyReminderState(
  state: DailyReminderState,
  storage: StorageLike = localStorage,
) {
  storage.setItem(DAILY_REMINDER_STATE_KEY, JSON.stringify(state));
}

export function dismissDailyReminderSlot(
  kind: DailyReminderKind,
  now: Date,
  storage: StorageLike = localStorage,
): DailyReminderState {
  const today = todayISO(now);
  const state = readDailyReminderState(storage);
  const next = { ...state };
  if (kind === 'morning') {
    next.morningLastCheckedDate = today;
  } else {
    next.eveningLastCheckedDate = today;
  }
  saveDailyReminderState(next, storage);
  return next;
}

function timeReached(now: Date, time: string): boolean {
  const [hour, minute] = time.split(':').map(Number);
  return now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute);
}

function isWeekend(now: Date): boolean {
  return now.getDay() === 0 || now.getDay() === 6;
}

export function getDailyReminderCandidate(
  now: Date,
  settings: DailyReminderSettings,
  state: DailyReminderState,
  hasRelevantTasks: boolean,
): DailyReminderCandidate | null {
  const today = todayISO(now);
  if (
    (!settings.weekendEnabled && isWeekend(now)) ||
    (!settings.showWhenNoTasks && !hasRelevantTasks)
  ) {
    return null;
  }

  const isMorningCutoff = timeReached(now, MORNING_CUTOFF_TIME);

  if (
    settings.morningEnabled &&
    !isMorningCutoff &&
    state.morningSnoozeDate === today &&
    state.morningSnoozeShownDate !== today &&
    state.morningSnoozeUntil &&
    new Date(state.morningSnoozeUntil).getTime() <= now.getTime()
  ) {
    return { kind: 'morning', source: 'snoozed' };
  }

  if (
    settings.morningEnabled &&
    !isMorningCutoff &&
    state.morningLastShownDate !== today &&
    state.morningLastCheckedDate !== today &&
    timeReached(now, settings.morningTime)
  ) {
    return { kind: 'morning', source: 'scheduled' };
  }

  if (
    settings.eveningEnabled &&
    state.eveningLastShownDate !== today &&
    state.eveningLastCheckedDate !== today &&
    timeReached(now, settings.eveningTime)
  ) {
    return { kind: 'evening', source: 'scheduled' };
  }

  return null;
}

export function evaluateAndSyncDailyReminders(
  now: Date,
  settings: DailyReminderSettings,
  hasRelevantTasks: boolean,
  storage: StorageLike = localStorage,
): DailyReminderCandidate | null {
  const today = todayISO(now);
  const state = readDailyReminderState(storage);

  if (
    settings.morningEnabled &&
    timeReached(now, MORNING_CUTOFF_TIME) &&
    state.morningLastCheckedDate !== today
  ) {
    dismissDailyReminderSlot('morning', now, storage);
  }

  if (
    settings.morningEnabled &&
    state.morningLastCheckedDate !== today &&
    state.morningLastShownDate !== today &&
    timeReached(now, settings.morningTime) &&
    !timeReached(now, MORNING_CUTOFF_TIME) &&
    !settings.showWhenNoTasks &&
    !hasRelevantTasks
  ) {
    dismissDailyReminderSlot('morning', now, storage);
  }

  if (
    settings.eveningEnabled &&
    state.eveningLastCheckedDate !== today &&
    state.eveningLastShownDate !== today &&
    timeReached(now, settings.eveningTime) &&
    !settings.showWhenNoTasks &&
    !hasRelevantTasks
  ) {
    dismissDailyReminderSlot('evening', now, storage);
  }

  const latestState = readDailyReminderState(storage);
  return getDailyReminderCandidate(now, settings, latestState, hasRelevantTasks);
}

export function claimDailyReminder(
  candidate: DailyReminderCandidate,
  now: Date,
  storage: StorageLike = localStorage,
): DailyReminderState {
  const today = todayISO(now);
  const state = readDailyReminderState(storage);
  const next = { ...state };
  if (candidate.kind === 'morning' && candidate.source === 'scheduled') {
    next.morningLastShownDate = today;
    next.morningLastCheckedDate = today;
  } else if (candidate.kind === 'morning') {
    next.morningSnoozeShownDate = today;
    next.morningSnoozeUntil = null;
    next.morningLastCheckedDate = today;
  } else {
    next.eveningLastShownDate = today;
    next.eveningLastCheckedDate = today;
  }
  saveDailyReminderState(next, storage);
  return next;
}

export function snoozeMorningReminder(
  now: Date,
  storage: StorageLike = localStorage,
  minutes = MORNING_SNOOZE_MINUTES,
): DailyReminderState {
  const today = todayISO(now);
  const state = readDailyReminderState(storage);
  if (state.morningSnoozeDate === today) return state;
  const next = {
    ...state,
    morningSnoozeDate: today,
    morningSnoozeUntil: new Date(now.getTime() + minutes * 60_000).toISOString(),
    morningSnoozeShownDate: null,
  };
  saveDailyReminderState(next, storage);
  return next;
}

export function canSnoozeMorning(now: Date, state: DailyReminderState): boolean {
  return !timeReached(now, MORNING_CUTOFF_TIME) && state.morningSnoozeDate !== todayISO(now);
}

function taskStartTime(task: Task, today: string): string | null {
  if (task.dateStart?.slice(0, 10) === today && task.dateStart.includes('T')) {
    return task.dateStart.slice(11, 16);
  }
  return task.dueTime;
}

export function isTaskOverdueAt(task: Task, now: Date): boolean {
  if (task.completedAt || !task.dueDate) return false;
  const today = todayISO(now);
  if (task.dueDate < today) return true;
  if (task.dueDate > today || !task.dueTime) return false;
  return (
    task.dueTime <
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  );
}

export function buildDailyReminderSummary(
  tasks: Task[],
  now: Date,
  options: { includeOverdue?: boolean } = {},
): DailyReminderSummary {
  const today = todayISO(now);
  const activeTasks = tasks.filter((task) => task.status !== 'draft');
  const todayTasks = activeTasks.filter((task) => task.dueDate === today);
  const todayIncomplete = todayTasks.filter((task) => !task.completedAt);
  const todayCompleted = todayTasks.filter((task) => Boolean(task.completedAt));
  const overdueTasks =
    options.includeOverdue === false
      ? []
      : activeTasks.filter((task) => isTaskOverdueAt(task, now));
  const priorityRank: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 };
  const byStartTime = (left: Task, right: Task) => {
    const leftTime = taskStartTime(left, today) ?? '99:99';
    const rightTime = taskStartTime(right, today) ?? '99:99';
    return (
      leftTime.localeCompare(rightTime) ||
      priorityRank[left.priority] - priorityRank[right.priority] ||
      left.sortOrder - right.sortOrder
    );
  };
  const morningTasks = [...todayIncomplete].sort(byStartTime);
  const eveningTasks = Array.from(
    new Map([...todayIncomplete, ...overdueTasks].map((task) => [task.id, task])).values(),
  ).sort((left, right) => {
    const leftDate = left.dueDate ?? '9999-12-31';
    const rightDate = right.dueDate ?? '9999-12-31';
    return leftDate.localeCompare(rightDate) || byStartTime(left, right);
  });
  return { todayTasks, todayIncomplete, todayCompleted, overdueTasks, morningTasks, eveningTasks };
}

function addCalendarDays(value: string, days: number): string {
  const [date, time] = value.split('T');
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(year, month - 1, day + days);
  const nextDate = todayISO(shifted);
  return time ? `${nextDate}T${time}` : nextDate;
}

function calendarDayDelta(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = to.split('-').map(Number);
  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) /
      86_400_000,
  );
}

export function taskDateMovePatch(task: Task, targetDate: string): Partial<Task> {
  if (task.dateMode !== 'advanced') return { dueDate: targetDate };
  const anchor = task.dateEnd?.slice(0, 10) ?? task.dueDate ?? task.dateStart?.slice(0, 10);
  if (!anchor) return { dueDate: targetDate };
  const days = calendarDayDelta(anchor, targetDate);
  const dateStart = task.dateStart ? addCalendarDays(task.dateStart, days) : null;
  const dateEnd = task.dateEnd ? addCalendarDays(task.dateEnd, days) : null;
  return {
    dateStart,
    dateEnd,
    dueDate: dateEnd?.slice(0, 10) ?? targetDate,
    dueTime: dateEnd?.includes('T') ? dateEnd.slice(11, 16) : task.dueTime,
  };
}

export function tomorrowISO(now = new Date()): string {
  return todayISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
}

export function automaticReschedulePatch(task: Task, now = new Date()): Partial<Task> | null {
  if (
    task.completedAt ||
    task.status === 'draft' ||
    !task.dueDate ||
    (task.reschedulePolicy ?? 'overdue') === 'overdue' ||
    !isTaskOverdueAt(task, now)
  ) {
    return null;
  }

  const today = todayISO(now);
  const targetDate =
    task.reschedulePolicy === 'next_available' &&
    task.dueDate < today &&
    task.timeFlexibility === 'window' &&
    task.timeWindowEnd &&
    task.timeWindowEnd >
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      ? today
      : tomorrowISO(now);

  if (targetDate <= task.dueDate) return null;
  return taskDateMovePatch(task, targetDate);
}
