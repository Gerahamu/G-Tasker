import { useMemo } from 'react';
import { getDueDateStatus } from '../../lib/format-date';
import { formatDueDate } from '../../lib/format-date';
import { useT } from '../../lib/i18n';

interface DueDateBadgeProps {
  dueDate: string | null;
  dueTime?: string | null;
  completed?: boolean;
}

export function DueDateBadge({ dueDate, dueTime, completed }: DueDateBadgeProps) {
  const { t, lang } = useT();
  // ✅ 传入 timeStr 做精确到时分的逾期判断
  const status = useMemo(() => getDueDateStatus(dueDate, dueTime), [dueDate, dueTime]);

  if (!dueDate) return null;
  if (completed) {
    return <span className="gt-badge gt-badge-muted text-xs">{formatDueDate(dueDate, lang, t)}</span>;
  }

  const colorClass =
    status === 'overdue'
      ? 'text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-950/40'
      : status === 'today'
        ? 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40'
        : 'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/40';

  const label = formatDueDate(dueDate, lang, t) + (dueTime ? ` ${dueTime}` : '');

  return (
    <span className={`meta-badge gt-badge ${colorClass}`}>
      {label}
    </span>
  );
}
