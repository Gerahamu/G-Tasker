import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTaskStore } from '../../stores/task-store';
import { useListStore } from '../../stores/list-store';
import { TaskList } from '../task/TaskList';
import { useT } from '../../lib/i18n';
import { isOverdue } from '../../lib/format-date';
import type { SmartListType } from '../../lib/types';

interface SmartListPageProps {
  type?: SmartListType;
}

export function SmartListPage({ type }: SmartListPageProps) {
  const { listId } = useParams<{ listId?: string }>();
  const { t } = useT();
  const tasks = useTaskStore((s) => s.tasks);
  const isLoading = useTaskStore((s) => s.isLoading);
  const loadAllTasks = useTaskStore((s) => s.loadAllTasks);
  const loadLists = useListStore((s) => s.loadLists);

  useEffect(() => {
    loadAllTasks();
    if (listId) loadLists();
  }, [listId]);

  const { filteredTasks, emptyMessage } = useMemo(() => {
    if (listId) {
      return { filteredTasks: tasks.filter((t) => t.listId === Number(listId) && t.status !== 'draft'), emptyMessage: t('noTasksInList') };
    }
    switch (type) {
      case 'today': return { filteredTasks: tasks.filter((t) => !t.completedAt && t.status !== 'draft' && t.dueDate === new Date().toISOString().slice(0, 10)), emptyMessage: t('noTasksToday') };
      case 'scheduled': return { filteredTasks: tasks.filter((t) => !t.completedAt && t.status !== 'draft' && t.dueDate !== null), emptyMessage: t('noScheduledTasks') };
      case 'flagged': return { filteredTasks: tasks.filter((t) => !t.completedAt && t.status !== 'draft' && t.isFlagged), emptyMessage: t('noFlaggedTasks') };
      case 'overdue': {
        return { filteredTasks: tasks.filter((t) => !t.completedAt && t.status !== 'draft' && isOverdue(t.dueDate, t.dueTime)), emptyMessage: t('noOverdueTasks') };
      }
      default: return { filteredTasks: tasks.filter((t) => t.status !== 'draft'), emptyMessage: t('noTasks') };
    }
  }, [type, listId, tasks, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <TaskList tasks={filteredTasks} emptyMessage={emptyMessage} />
    </div>
  );
}
