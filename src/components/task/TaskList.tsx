import { useT } from '../../lib/i18n';
import { TaskRow } from './TaskRow';
import type { Task } from '../../lib/types';

interface TaskListProps {
  tasks: Task[];
  emptyMessage?: string;
}

export function TaskList({ tasks, emptyMessage }: TaskListProps) {
  const { t } = useT();
  const msg = emptyMessage || t('noTasks2');
  const incomplete = tasks.filter((t) => !t.completedAt);
  const completed = tasks.filter((t) => t.completedAt);

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-mark" aria-hidden="true" />
        <p>{msg}</p>
      </div>
    );
  }

  return (
    <div className="task-list-surface">
      {incomplete.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
      {completed.length > 0 && (
        <>
          <div className="task-list-section-label">
            {t('completed')} ({completed.length})
          </div>
          {completed.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </>
      )}
    </div>
  );
}
