import { useEffect } from 'react';
import { createBrowserRouter, createHashRouter, Navigate, useNavigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { SmartListPage } from '../components/smart-list/SmartListPage';
import { TaskDetailPage } from '../components/task-detail/TaskDetailPage';
import { SearchPage } from '../components/search/SearchPage';
import { CalendarPage } from '../components/calendar/CalendarPage';
import { SettingsPage } from '../components/settings/SettingsPage';
import { MemoPage } from '../components/memo/MemoPage';
import { PlanPage } from '../components/planning/PlanPage';
import { ClockPage } from '../components/clock/ClockPage';
import { ListsPage } from '../components/lists/ListsPage';
import { TagsPage, LegacyTagRedirect } from '../components/tags/TagsPage';
import { useUIStore } from '../stores/ui-store';

function CreateTaskRedirect() {
  const setShow = useUIStore((s) => s.setShowCreateModal);
  const navigate = useNavigate();
  useEffect(() => {
    setShow(true);
    navigate('/app/all', { replace: true });
  }, []);
  return null;
}

function DefaultRedirect() {
  const view = (() => {
    try {
      return JSON.parse(localStorage.getItem('task-default-view') || '"today"');
    } catch {
      return 'today';
    }
  })();
  return <Navigate to={`/app/${view}`} replace />;
}

const createRouter = window.location.protocol === 'file:' ? createHashRouter : createBrowserRouter;

export const router = createRouter([
  {
    path: '/',
    element: <DefaultRedirect />,
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      {
        path: 'today',
        element: <SmartListPage type="today" />,
      },
      {
        path: 'scheduled',
        element: <SmartListPage type="scheduled" />,
      },
      {
        path: 'all',
        element: <SmartListPage type="all" />,
      },
      {
        path: 'flagged',
        element: <SmartListPage type="flagged" />,
      },
      {
        path: 'overdue',
        element: <SmartListPage type="overdue" />,
      },
      {
        path: 'list/:listId',
        element: <SmartListPage />,
      },
      {
        path: 'task/new',
        element: <CreateTaskRedirect />,
      },
      {
        path: 'task/:taskId',
        element: <TaskDetailPage />,
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
      {
        path: 'lists',
        element: <ListsPage />,
      },
      {
        path: 'tag/:tagName',
        element: <LegacyTagRedirect />,
      },
      {
        path: 'calendar',
        element: <CalendarPage />,
      },
      {
        path: 'inbox',
        element: <Navigate to="/app/today" replace />,
      },
      {
        path: 'planning',
        element: <PlanPage />,
      },
      {
        path: 'tags',
        element: <TagsPage />,
      },
      {
        path: 'tags/:tagId',
        element: <TagsPage />,
      },
      {
        path: 'memo',
        element: <MemoPage />,
      },
      {
        path: 'clock',
        element: <ClockPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);
