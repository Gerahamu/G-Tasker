import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/sidebar/Sidebar';
import { Navbar } from '../components/ui/Navbar';
import { ToastContainer } from '../components/ui/ToastContainer';
import { CreateTaskModal } from '../components/task/CreateTaskModal';
import { useUIStore } from '../stores/ui-store';

export function AppLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const showCreateModal = useUIStore((s) => s.showCreateModal);
  const setShowCreateModal = useUIStore((s) => s.setShowCreateModal);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const location = useLocation();

  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-scrim" onClick={toggleSidebar} aria-label="关闭导航" />}
      <aside className={`app-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <Sidebar />
      </aside>
      <div className="app-workspace">
        <Navbar />
        <main className="app-main">
          <div className="page-enter"><Outlet /></div>
        </main>
      </div>
      <ToastContainer />
      <CreateTaskModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
