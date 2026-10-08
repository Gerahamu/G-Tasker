import type { Priority } from '../../lib/types';
import { useT } from '../../lib/i18n';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

const COLOR_CLASSES: Record<Priority, string> = {
  high: 'text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-950/40',
  medium: 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40',
  low: 'gt-badge-muted',
};

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const { t } = useT();
  const sizeClass = size === 'sm' ? 'text-xs' : 'text-xs';
  return (
    <span className={`meta-badge gt-badge ${sizeClass} ${COLOR_CLASSES[priority]}`}>
      {priority === 'high' && '!! '}
      {priority === 'medium' && '! '}
      {t(priority)}
    </span>
  );
}
