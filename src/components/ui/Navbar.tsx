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
    if (path === '/app/clock') return t('clock');
    if (path === '/app/calendar') return t('calendar');
    if (path === '/app/search') return t('search');
    if (path === '/app/tags') return t('tagsManage');
    if (path === '/app/settings') return t('settings');
    if (path.includes('/app/list/')) return t('listView');
    if (path.includes('/app/task/')) return t('taskDetail');
    return t('appName');
  };

  const showAddButton = ![
    '/app/search',
    '/app/tags',
    '/app/clock',
    '/app/calendar',
    '/app/settings',
    '/app/memo',
    '/app/inbox',
    '/app/planning',
  ].includes(location.pathname);

  return (
    <header className="app-navbar">
      <div className="flex items-center gap-3">
        {!sidebarOpen && (
          <button onClick={toggleSidebar} className="icon-button" aria-label="打开导航">
            <Menu size={19} />
          </button>
        )}
        <h2 className="navbar-title">{getTitle()}</h2>
      </div>
      <div>
        {showAddButton && (
          <button
            onClick={() => {
              setPresetListId(currentListId);
              setShowCreateModal(true);
            }}
            className="btn btn-primary navbar-create"
          >
            <Plus size={15} /> {t('newTask')}
          </button>
        )}
      </div>
    </header>
  );
}
