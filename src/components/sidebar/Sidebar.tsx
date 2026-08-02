import { useNavigate, useLocation } from 'react-router-dom';
import { SmartListsSection } from './SmartListsSection';
import { useUIStore } from '../../stores/ui-store';
import { useListStore } from '../../stores/list-store';
import { useEffect } from 'react';
import { useT } from '../../lib/i18n';
import { Search, Calendar, Settings, ChevronLeft, StickyNote, Lightbulb, Tags, Layout, Clock } from 'lucide-react';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useT();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const loadLists = useListStore((s) => s.loadLists);

  useEffect(() => { loadLists(); }, []);

  const linkClass = (path: string) =>
    `sidebar-link ${location.pathname === path ? 'active' : ''}`;

  return (
    <div className="sidebar-surface">
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true"><span /></div>
        <h1 className="brand-name">{t('appName')}</h1>
        <button onClick={toggleSidebar} className="icon-button sidebar-collapse" aria-label="收起导航"><ChevronLeft size={17} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <SmartListsSection />
        <div className="pt-2 space-y-0.5">
          <button onClick={() => navigate('/app/inbox')} className={linkClass('/app/inbox')}><Lightbulb size={16} /><span className="sidebar-nav-label">{t('inboxNav')}</span></button>
          <button onClick={() => navigate('/app/memo')} className={linkClass('/app/memo')}><StickyNote size={16} /><span className="sidebar-nav-label">{t('memoNav')}</span></button>
          <button onClick={() => navigate('/app/planning')} className={linkClass('/app/planning')}><Layout size={16} /><span className="sidebar-nav-label">{t('planNav')}</span></button>
          <button onClick={() => navigate('/app/clock')} className={linkClass('/app/clock')}><Clock size={16} /><span className="sidebar-nav-label">{t('clock')}</span></button>
          <button onClick={() => navigate('/app/calendar')} className={linkClass('/app/calendar')}><Calendar size={16} /><span className="sidebar-nav-label">{t('calendar')}</span></button>
          <button onClick={() => navigate('/app/tags')} className={linkClass('/app/tags')}><Tags size={16} /><span className="sidebar-nav-label">{t('tagsNav')}</span></button>
          <button onClick={() => navigate('/app/search')} className={linkClass('/app/search')}><Search size={16} /><span className="sidebar-nav-label">{t('search')}</span></button>
        </div>
      </div>

      <div className="sidebar-footer">
        <button onClick={() => navigate('/app/settings')} className={linkClass('/app/settings')}><Settings size={16} /><span className="sidebar-nav-label">{t('settings')}</span></button>
      </div>
    </div>
  );
}
