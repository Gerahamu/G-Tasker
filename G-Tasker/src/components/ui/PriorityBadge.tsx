import type { Priority } from '../../lib/types';
import { PRIORITY_LABELS } from '../../lib/constants';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

const COLOR_CLASSES: Record<Priority, string> = {
  high: 'text-red-600 bg-red-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-gray-500 bg-gray-100',
};

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
  return (
    <span className={`inline-flex items-center rounded font-medium ${sizeClass} ${COLOR_CLASSES[priority]}`}>
      {priority === 'high' && '!! '}
      {priority === 'medium' && '! '}
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
