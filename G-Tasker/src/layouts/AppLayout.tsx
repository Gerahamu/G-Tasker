import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/sidebar/Sidebar';
import { Navbar } from '../components/ui/Navbar';
import { ToastContainer } from '../components/ui/ToastContainer';
import { CreateTaskModal } from '../components/task/CreateTaskModal';
import { useUIStore } from '../stores/ui-store';

export function AppLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const showCreateModal = useUIStore((s) => s.showCreateModal);
  const setShowCreateModal = useUIStore((s) => s.setShowCreateModal);

  return (
    <div className="flex h-screen bg-white">
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-200 overflow-hidden border-r border-gray-200 flex-shrink-0`}>
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
      <CreateTaskModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
