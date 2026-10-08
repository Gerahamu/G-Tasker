import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTaskStore } from '../../stores/task-store';
import { useListStore } from '../../stores/list-store';
import { TaskList } from '../task/TaskList';
import { useT } from '../../lib/i18n';
import { isOverdue, todayISO } from '../../lib/format-date';
import type { SmartListType } from '../../lib/types';
import type { TimeMark } from '../../lib/types';
import { db } from '../../db/database';
import { calendarDayDifference } from '../../lib/task-dates';

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
  const [timeMarks, setTimeMarks] = useState<TimeMark[]>([]);

  useEffect(() => {
    loadAllTasks();
    if (listId) loadLists();
    db.timeMarks.toArray().then(setTimeMarks);
  }, [listId]);

  const { filteredTasks, emptyMessage } = useMemo(() => {
    if (listId) {
      return {
        filteredTasks: tasks.filter((t) => t.listId === Number(listId) && t.status !== 'draft'),
        emptyMessage: t('noTasksInList'),
      };
    }
    switch (type) {
      case 'today':
        return {
          filteredTasks: tasks.filter(
            (t) => !t.completedAt && t.status !== 'draft' && t.dueDate === todayISO(),
          ),
          emptyMessage: t('noTasksToday'),
        };
      case 'scheduled':
        return {
          filteredTasks: tasks.filter(
            (t) => !t.completedAt && t.status !== 'draft' && t.dueDate !== null,
          ),
          emptyMessage: t('noScheduledTasks'),
        };
      case 'flagged':
        return {
          filteredTasks: tasks.filter((t) => !t.completedAt && t.status !== 'draft' && t.isFlagged),
          emptyMessage: t('noFlaggedTasks'),
        };
      case 'overdue': {
        return {
          filteredTasks: tasks.filter(
            (t) => !t.completedAt && t.status !== 'draft' && isOverdue(t.dueDate, t.dueTime),
          ),
          emptyMessage: t('noOverdueTasks'),
        };
      }
      default:
        return {
          filteredTasks: tasks.filter((t) => t.status !== 'draft'),
          emptyMessage: t('noTasks'),
        };
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
      {(type === 'today' || type === 'all') && timeMarks.filter((mark) => mark.showOnHome && mark.startDate <= todayISO() && mark.endDate >= todayISO()).length > 0 && <section className="mb-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm"><h3 className="text-sm font-semibold text-gray-800 mb-2">当前阶段</h3>{timeMarks.filter((mark) => mark.showOnHome && mark.startDate <= todayISO() && mark.endDate >= todayISO()).map((mark) => { const day = calendarDayDifference(mark.startDate, todayISO()) + 1; const total = calendarDayDifference(mark.startDate, mark.endDate) + 1; return <div key={mark.id} className="text-sm py-1" style={{ color: mark.color }}><strong>{mark.title}</strong><span className="ml-2 text-xs text-gray-500">第 {day} / {total} 天 · 还有 {total - day} 天</span></div>; })}</section>}
      <TaskList
        key={`${type ?? 'list'}:${listId ?? ''}`}
        tasks={filteredTasks}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
