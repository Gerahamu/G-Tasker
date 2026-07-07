import { useNavigate, useLocation } from 'react-router-dom';
import { SmartListsSection } from './SmartListsSection';
import { useUIStore } from '../../stores/ui-store';
import { useListStore } from '../../stores/list-store';
import { useEffect } from 'react';
import { useT } from '../../lib/i18n';
import { Search, Calendar, Settings, ChevronLeft, StickyNote, Lightbulb, Tags, Layout } from 'lucide-react';

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
    <div className="h-full flex flex-col bg-[#f8f9fb] dark:bg-[#0f1117] border-r border-gray-100/80 dark:border-gray-800/50">
      <div className="px-4 py-4 flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-800 dark:text-gray-100 tracking-tight">{t('appName')}</h1>
        <button onClick={toggleSidebar} className="p-1.5 hover:bg-gray-200/60 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"><ChevronLeft size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-0.5">
        <SmartListsSection />
        <div className="pt-2 space-y-0.5">
          <button onClick={() => navigate('/app/inbox')} className={linkClass('/app/inbox')}><Lightbulb size={16} /> {t('inboxNav')}</button>
          <button onClick={() => navigate('/app/memo')} className={linkClass('/app/memo')}><StickyNote size={16} /> {t('memoNav')}</button>
          <button onClick={() => navigate('/app/planning')} className={linkClass('/app/planning')}><Layout size={16} /> {t('planNav')}</button>
          <button onClick={() => navigate('/app/calendar')} className={linkClass('/app/calendar')}><Calendar size={16} /> {t('calendar')}</button>
          <button onClick={() => navigate('/app/tags')} className={linkClass('/app/tags')}><Tags size={16} /> {t('tagsNav')}</button>
          <button onClick={() => navigate('/app/search')} className={linkClass('/app/search')}><Search size={16} /> {t('search')}</button>
        </div>
      </div>

      <div className="p-2.5 border-t border-gray-100/80 dark:border-gray-800/50">
        <button onClick={() => navigate('/app/settings')} className={linkClass('/app/settings')}><Settings size={16} /> {t('settings')}</button>
      </div>
    </div>
  );
}
