import type { Task } from './types';

const TASK_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function localDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !TASK_TIME_PATTERN.test(time)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(value.getTime()) ? null : value;
}

/**
 * Resolves the task-owned reminder into a local wall-clock time. Date-only
 * deadlines use 09:00 as their stable notification time because they do not
 * carry a user-selected hour.
 */
export function getTaskReminderAt(task: Task): Date | null {
  if (task.completedAt || task.status === 'draft' || !task.reminder) return null;

  const anchorDate =
    task.reminder.anchor === 'start' ? task.dateStart?.slice(0, 10) : task.dueDate;
  if (!anchorDate) return null;
  const anchorTime =
    task.reminder.anchor === 'start'
      ? task.dateStart?.includes('T')
        ? task.dateStart.slice(11, 16)
        : null
      : task.dueTime || '09:00';
  if (!anchorTime) return null;

  const value = localDateTime(anchorDate, anchorTime);
  if (!value) return null;
  value.setMinutes(value.getMinutes() - Math.max(0, task.reminder.minutesBefore || 0));
  return value;
}

export function taskReminderTitle(task: Task): string {
  return task.title.trim() || '未命名任务';
}
