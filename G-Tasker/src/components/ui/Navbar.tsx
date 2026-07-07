import { useLocation } from 'react-router-dom';
import { useUIStore } from '../../stores/ui-store';
import { useT } from '../../lib/i18n';
import { Menu, Plus } from 'lucide-react';

export function Navbar() {
  const location = useLocation();
  const { t } = useT();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setShowCreateModal = useUIStore((s) => s.setShowCreateModal);
  const setPresetListId = useUIStore((s) => s.setPresetListId);

  const listMatch = location.pathname.match(/^\/app\/list\/(\d+)$/);
  const currentListId = listMatch ? Number(listMatch[1]) : null;

  const getTitle = () => {
    const path = location.pathname;
    if (path === '/app/today') return t('today');
    if (path === '/app/scheduled') return t('scheduled');
    if (path === '/app/all') return t('allTasks');
    if (path === '/app/flagged') return t('flagged');
    if (path === '/app/overdue') return t('overdue');
    if (path === '/app/inbox') return t('inboxNav');
    if (path === '/app/memo') return t('memoNav');
    if (path === '/app/planning') return t('planNav');
    if (path === '/app/calendar') return t('calendar');
    if (path === '/app/search') return t('search');
    if (path === '/app/tags') return t('tagsManage');
    if (path === '/app/settings') return t('settings');
    if (path.includes('/app/list/')) return t('listView');
    if (path.includes('/app/task/')) return t('taskDetail');
    return t('appName');
  };

  const showAddButton = !['/app/search','/app/tags','/app/calendar','/app/settings','/app/memo','/app/inbox','/app/planning'].includes(location.pathname);

  return (
    <header className="h-14 border-b border-gray-100/80 dark:border-gray-800/50 flex items-center justify-between px-5 bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-md flex-shrink-0">
      <div className="flex items-center gap-3">
        {!sidebarOpen && (
          <button onClick={toggleSidebar} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400"><Menu size={18} /></button>
        )}
        <h2 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">{getTitle()}</h2>
      </div>
      <div>
        {showAddButton && (
          <button onClick={() => { setPresetListId(currentListId); setShowCreateModal(true); }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2563eb] text-white rounded-[10px] text-[13px] font-medium hover:bg-[#1d4ed8] active:scale-[0.98] transition-all duration-150 shadow-sm">
            <Plus size={15} /> {t('newTask')}
          </button>
        )}
      </div>
    </header>
  );
}
