import { format, isToday, isTomorrow, parseISO, isThisWeek } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = parseISO(dateStr);
  if (isToday(date)) return '今天';
  if (isTomorrow(date)) return '明天';
  return format(date, 'M月d日', { locale: zhCN });
}

export function formatDueDateTime(dateStr: string | null, timeStr: string | null): string {
  if (!dateStr) return '';
  const base = formatDueDate(dateStr);
  if (timeStr) return `${base} ${timeStr}`;
  return base;
}

// ✅ 精确到时分的逾期判断
export function getDueDateStatus(
  dateStr: string | null,
  timeStr?: string | null
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
  if (dueDateTime >= todayStart && dueDateTime < new Date(todayStart.getTime() + 86400000)) return 'today';
  return 'upcoming';
}

export function isOverdue(dateStr: string | null, timeStr?: string | null): boolean {
  return getDueDateStatus(dateStr, timeStr) === 'overdue';
}

export function formatRelative(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return `今天 ${format(date, 'HH:mm')}`;
  if (isThisWeek(date)) return format(date, 'EEEE HH:mm', { locale: zhCN });
  return format(date, 'yyyy年M月d日 HH:mm', { locale: zhCN });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowISO(): string {
  return new Date().toISOString();
}
