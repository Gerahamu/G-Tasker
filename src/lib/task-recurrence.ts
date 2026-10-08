import type { Task, TaskRepeatRule } from './types';

function dateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addMonthsClamped(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

function nextWeekday(date: Date, weekdays: number[], intervalWeeks: number): Date {
  const validDays = [...new Set(weekdays)].filter((day) => day >= 0 && day <= 6).sort();
  if (validDays.length === 0) {
    const next = new Date(date);
    next.setDate(next.getDate() + 7 * Math.max(1, intervalWeeks));
    return next;
  }

  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const minimumDate = new Date(date);
  minimumDate.setDate(minimumDate.getDate() + (intervalWeeks > 0 ? 7 * intervalWeeks : 1));
  while (next < minimumDate || !validDays.includes(next.getDay())) next.setDate(next.getDate() + 1);
  return next;
}

function nextDateFromRule(date: Date, rule: TaskRepeatRule): Date {
  if (rule.frequency === 'daily') {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (rule.frequency === 'weekly') return nextWeekday(date, rule.weekdays ?? [], 1);
  if (rule.frequency === 'monthly') return addMonthsClamped(date, 1);

  const interval = Math.max(1, rule.interval ?? 1);
  if (rule.unit === 'week') return nextWeekday(date, rule.weekdays ?? [], interval);
  if (rule.unit === 'month') return addMonthsClamped(date, interval);
  const next = new Date(date);
  next.setDate(next.getDate() + interval);
  return next;
}

export function nextRecurringTaskDate(task: Task): string | null {
  if (!task.repeatRule || task.repeatRule.frequency === 'none' || !task.dueDate) return null;
  const current = dateOnly(task.dueDate);
  if (!current) return null;
  const next = nextDateFromRule(current, task.repeatRule);
  const nextDate = formatDate(next);
  if (task.repeatRule.endDate && nextDate > task.repeatRule.endDate) return null;
  return nextDate;
}
