import { useMemo } from 'react';
import { getDueDateStatus } from '../../lib/format-date';
import { formatDueDate } from '../../lib/format-date';

interface DueDateBadgeProps {
  dueDate: string | null;
  dueTime?: string | null;
  completed?: boolean;
}

export function DueDateBadge({ dueDate, dueTime, completed }: DueDateBadgeProps) {
  // ✅ 传入 timeStr 做精确到时分的逾期判断
  const status = useMemo(() => getDueDateStatus(dueDate, dueTime), [dueDate, dueTime]);

  if (!dueDate) return null;
  if (completed) {
    return <span className="text-xs text-gray-400">{formatDueDate(dueDate)}</span>;
  }

  const colorClass =
    status === 'overdue' ? 'text-red-600 bg-red-50' :
    status === 'today' ? 'text-amber-600 bg-amber-50' :
    'text-blue-600 bg-blue-50';

  const label = formatDueDate(dueDate) + (dueTime ? ` ${dueTime}` : '');

  return (
    <span className={`inline-flex items-center rounded text-xs px-1.5 py-0.5 font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
