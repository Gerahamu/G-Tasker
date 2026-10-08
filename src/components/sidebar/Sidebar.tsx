import { useNavigate, useLocation } from 'react-router-dom';
import { SmartListsSection } from './SmartListsSection';
import { useUIStore } from '../../stores/ui-store';
import { useListStore } from '../../stores/list-store';
import { useEffect } from 'react';
import { useT } from '../../lib/i18n';
import appIcon from '../../../assets/gtasker-app-icon.png';
import { Search, Settings, StickyNote, Clock, List, Tag, type LucideIcon } from 'lucide-react';
import { CollapsibleSidebarSection } from './CollapsibleSidebarSection';
import { useSidebarSection } from './sidebar-section-state';

const TOOLS: Array<{
  path: string;
  icon: LucideIcon;
  label: 'myLists' | 'memoNav' | 'clock' | 'tagsNav';
}> = [
  { path: '/app/lists', icon: List, label: 'myLists' },
  { path: '/app/memo', icon: StickyNote, label: 'memoNav' },
  { path: '/app/clock', icon: Clock, label: 'clock' },
  { path: '/app/tags', icon: Tag, label: 'tagsNav' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useT();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const loadLists = useListStore((s) => s.loadLists);
  const toolsSection = useSidebarSection(
    'tools',
    ['/app/lists', '/app/memo', '/app/clock', '/app/search'].includes(location.pathname) ||
      location.pathname.startsWith('/app/tags'),
  );

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const isPathActive = (path: string) =>
    path === '/app/tags' ? location.pathname.startsWith('/app/tags') : location.pathname === path;
  const linkClass = (path: string) => `sidebar-link ${isPathActive(path) ? 'active' : ''}`;

  return (
    <div className="sidebar-surface gt-material-nav">
      <div className="sidebar-brand">
        <button
          type="button"
          onClick={toggleSidebar}
          className="brand-mark-button"
          aria-label={t(sidebarOpen ? 'closeNavigation' : 'openNavigation')}
        >
          <img
            className="brand-mark"
            data-ui="brand-mark"
            src={appIcon}
            alt=""
            aria-hidden="true"
          />
        </button>
        <h1 className="brand-name">{t('appName')}</h1>
      </div>

      <div className="sidebar-navigation flex-1 overflow-y-auto">
        <SmartListsSection />
        <CollapsibleSidebarSection
          id="tools"
          label="tools"
          expanded={toolsSection.expanded}
          onToggle={toolsSection.toggle}
        >
          <div className="sidebar-tools">
            {TOOLS.map(({ path, icon: Icon, label }) => (
              <button
                type="button"
                key={path}
                onClick={() => navigate(path)}
                className={linkClass(path)}
                aria-current={isPathActive(path) ? 'page' : undefined}
              >
                <span className="sidebar-link-content" data-ui="sidebar-content">
                  <span className="sidebar-icon-lift" data-ui="sidebar-icon" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <span className="sidebar-nav-label">{t(label)}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate('/app/search')}
              className={linkClass('/app/search')}
              aria-current={location.pathname === '/app/search' ? 'page' : undefined}
            >
              <span className="sidebar-link-content" data-ui="sidebar-content">
                <span className="sidebar-icon-lift" data-ui="sidebar-icon" aria-hidden="true">
                  <Search size={16} />
                </span>
                <span className="sidebar-nav-label">{t('search')}</span>
              </span>
            </button>
          </div>
        </CollapsibleSidebarSection>
      </div>

      <div className="sidebar-footer">
        <button
          onClick={() => navigate('/app/settings')}
          className={linkClass('/app/settings')}
          aria-current={location.pathname === '/app/settings' ? 'page' : undefined}
        >
          <span className="sidebar-link-content" data-ui="sidebar-content">
            <span className="sidebar-icon-lift" data-ui="sidebar-icon" aria-hidden="true">
              <Settings size={16} />
            </span>
            <span className="sidebar-nav-label">{t('settings')}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
