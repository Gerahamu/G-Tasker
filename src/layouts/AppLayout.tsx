import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/sidebar/Sidebar';
import { Navbar } from '../components/ui/Navbar';
import { ToastContainer } from '../components/ui/ToastContainer';
import { CreateTaskModal } from '../components/task/CreateTaskModal';
import { useUIStore } from '../stores/ui-store';
import { useT } from '../lib/i18n';
import { DailyReminderCoordinator } from '../components/reminders/DailyReminderCoordinator';
import { ClockReminderCoordinator } from '../components/reminders/ClockReminderCoordinator';
import { ReminderOverlay } from '../components/clock/ReminderOverlay';
import { TaskAutomationCoordinator } from '../components/task/TaskAutomationCoordinator';

export function AppLayout() {
  const { t } = useT();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const showCreateModal = useUIStore((s) => s.showCreateModal);
  const setShowCreateModal = useUIStore((s) => s.setShowCreateModal);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);
  const isTaskDetail = /^\/app\/task\/[^/]+$/.test(location.pathname);

  useEffect(() => {
    if (
      previousPathRef.current !== location.pathname &&
      window.matchMedia('(max-width: 767px)').matches
    ) {
      setSidebarOpen(false);
    }
    previousPathRef.current = location.pathname;
  }, [location.pathname, setSidebarOpen]);

  return (
    <div className="app-shell" data-ui="app-shell">
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          onClick={toggleSidebar}
          aria-label={t('dismissNavigation')}
        />
      )}
      <aside className={`app-sidebar ${sidebarOpen ? 'is-open' : ''}`} data-ui="sidebar">
        <Sidebar />
      </aside>
      <div className="app-workspace" data-ui="workspace">
        {!isTaskDetail && <Navbar />}
        <main
          className={`app-main ${isTaskDetail ? 'app-main-task-detail' : ''}`}
        >
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
      <ToastContainer />
      {showCreateModal && <CreateTaskModal open onClose={() => setShowCreateModal(false)} />}
      <ClockReminderCoordinator />
      <ReminderOverlay />
      <DailyReminderCoordinator />
      <TaskAutomationCoordinator />
    </div>
  );
}
