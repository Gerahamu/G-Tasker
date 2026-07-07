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
      <div className="text-center py-12">
        <p className="text-gray-400 text-sm">{msg}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {incomplete.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
      {completed.length > 0 && (
        <>
          <div className="px-3 py-2 bg-gray-50 text-xs text-gray-400 font-medium border-b border-gray-100">
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
