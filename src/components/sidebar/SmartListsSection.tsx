import { useMemo, type ElementType } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, List, Flag, AlertCircle, Layout } from 'lucide-react';
import type { SmartListType } from '../../lib/types';
import { useT, type TranslationKey } from '../../lib/i18n';
import { useTaskStore } from '../../stores/task-store';
import { isOverdue, todayISO } from '../../lib/format-date';
import { CollapsibleSidebarSection } from './CollapsibleSidebarSection';
import { useSidebarSection } from './sidebar-section-state';

interface NavigationItem {
  type: SmartListType | 'planning' | 'calendar';
  icon: ElementType;
  key: TranslationKey;
}

const PRIMARY_ITEMS: NavigationItem[] = [
  { type: 'today', icon: Calendar, key: 'today' },
  { type: 'planning', icon: Layout, key: 'planNav' },
  { type: 'calendar', icon: Calendar, key: 'calendar' },
];

const TASK_ITEMS: NavigationItem[] = [
  { type: 'all', icon: List, key: 'allTasks' },
  { type: 'scheduled', icon: Clock, key: 'scheduled' },
  { type: 'flagged', icon: Flag, key: 'flagged' },
  { type: 'overdue', icon: AlertCircle, key: 'overdue' },
];

export function SmartListsSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useT();
  const tasks = useTaskStore((s) => s.tasks);
  const taskSection = useSidebarSection(
    'tasks',
    location.pathname.startsWith('/app/all') ||
      location.pathname.startsWith('/app/scheduled') ||
      location.pathname.startsWith('/app/flagged') ||
      location.pathname.startsWith('/app/overdue'),
  );
  const counts = useMemo(() => {
    const today = todayISO();
    const active = tasks.filter((task) => !task.completedAt && task.status !== 'draft');
    return {
      today: active.filter((task) => task.dueDate === today).length,
      scheduled: active.filter((task) => task.dueDate !== null).length,
      all: active.length,
      allTotal: tasks.filter((task) => task.status !== 'draft').length,
      flagged: active.filter((task) => task.isFlagged).length,
      overdue: active.filter((task) => isOverdue(task.dueDate, task.dueTime)).length,
    };
  }, [tasks]);

  const renderNavigationItem = ({ type, icon: Icon, key }: NavigationItem, section: string) => {
    const path = `/app/${type}`;
    const isActive = location.pathname === path;
    const count =
      type === 'today'
        ? counts.today
        : type === 'all'
          ? counts.allTotal
          : type === 'scheduled' || type === 'flagged' || type === 'overdue'
            ? counts[type]
            : 0;

    return (
      <button
        key={type}
        onClick={() => navigate(path)}
        className={`sidebar-link sidebar-link-${section} ${isActive ? 'active' : ''}`}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="sidebar-link-content" data-ui="sidebar-content">
          <span className="sidebar-icon-lift" data-ui="sidebar-icon" aria-hidden="true">
            <Icon size={16} />
          </span>
          <span className="sidebar-nav-label flex-1 text-left">{t(key)}</span>
          {count > 0 && (
            <span className={`sidebar-count ${type === 'overdue' ? 'is-overdue' : ''}`}>
              {count}
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <>
      <nav className="sidebar-primary" aria-label={t('appName')}>
        {PRIMARY_ITEMS.map((item) => renderNavigationItem(item, 'primary'))}
      </nav>

      <CollapsibleSidebarSection
        id="tasks"
        label="smartLists"
        expanded={taskSection.expanded}
        onToggle={taskSection.toggle}
      >
        <div className="sidebar-task-views">
          {TASK_ITEMS.map((item) => renderNavigationItem(item, 'task'))}
        </div>
      </CollapsibleSidebarSection>
    </>
  );
}
