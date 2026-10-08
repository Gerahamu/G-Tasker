import { isToday, isTomorrow, parseISO, isThisWeek } from 'date-fns';
import { localeFor } from './i18n';
import type { ResolvedLanguage, Translate } from './i18n';

export function formatDueDate(
  dateStr: string | null,
  lang: ResolvedLanguage,
  t: Translate,
): string {
  if (!dateStr) return '';
  const date = parseISO(dateStr);
  if (isToday(date)) return t('today');
  if (isTomorrow(date)) return t('tomorrow');
  return new Intl.DateTimeFormat(localeFor(lang), { month: 'short', day: 'numeric' }).format(date);
}

export function formatDueDateTime(
  dateStr: string | null,
  timeStr: string | null,
  lang: ResolvedLanguage,
  t: Translate,
): string {
  if (!dateStr) return '';
  const base = formatDueDate(dateStr, lang, t);
  if (timeStr) return `${base} ${timeStr}`;
  return base;
}

// ✅ 精确到时分的逾期判断
export function getDueDateStatus(
  dateStr: string | null,
  timeStr?: string | null,
): 'overdue' | 'today' | 'upcoming' | 'none' {
  if (!dateStr) return 'none';

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 构造截止时间
  let dueDateTime: Date;
  if (timeStr && timeStr.includes(':')) {
    const [h, m] = timeStr.split(':').map(Number);
    dueDateTime = parseISO(dateStr);
    dueDateTime.setHours(h || 0, m || 0, 0, 0);
  } else {
    // 仅日期：截止时间为当天结束
    dueDateTime = parseISO(dateStr);
    dueDateTime.setHours(23, 59, 59, 999);
  }

  if (dueDateTime.getTime() < now.getTime()) return 'overdue';
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (dueDateTime >= todayStart && dueDateTime < tomorrowStart)
    return 'today';
  return 'upcoming';
}

export function isOverdue(dateStr: string | null, timeStr?: string | null): boolean {
  return getDueDateStatus(dateStr, timeStr) === 'overdue';
}

export function formatRelative(dateStr: string, lang: ResolvedLanguage, t: Translate): string {
  const date = parseISO(dateStr);
  const time = new Intl.DateTimeFormat(localeFor(lang), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  if (isToday(date)) return `${t('today')} ${time}`;
  if (isThisWeek(date))
    return new Intl.DateTimeFormat(localeFor(lang), {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  return new Intl.DateTimeFormat(localeFor(lang), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function todayISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
