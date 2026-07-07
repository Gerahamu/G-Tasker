import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, List, Flag, AlertCircle, ChevronDown, Trash2, Plus } from 'lucide-react';
import type { SmartListType } from '../../lib/types';
import { useT } from '../../lib/i18n';
import { useTaskStore } from '../../stores/task-store';
import { useListStore } from '../../stores/list-store';
import { isOverdue } from '../../lib/format-date';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface SmartItem {
  type: SmartListType;
  icon: React.ElementType;
  key: 'today' | 'scheduled' | 'allTasks' | 'flagged' | 'overdue';
  countColor: 'blue' | 'red' | 'auto';
}

const ITEMS: SmartItem[] = [
  { type: 'today', icon: Calendar, key: 'today', countColor: 'blue' },
  { type: 'scheduled', icon: Clock, key: 'scheduled', countColor: 'blue' },
  { type: 'all', icon: List, key: 'allTasks', countColor: 'auto' },
  { type: 'flagged', icon: Flag, key: 'flagged', countColor: 'blue' },
  { type: 'overdue', icon: AlertCircle, key: 'overdue', countColor: 'red' },
];

export function SmartListsSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useT();
  const tasks = useTaskStore((s) => s.tasks);
  const allLists = useListStore((s) => s.lists);
  const deleteList = useListStore((s) => s.deleteList);
  const addList = useListStore((s) => s.addList);
  const [collapsed, setCollapsed] = useState(false);
  const [listsCollapsed, setListsCollapsed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const dup = userLists.find(l => l.name === newName.trim());
    if (dup) { setNewName(''); setShowNewInput(false); navigate(`/app/list/${dup.id}`); return; }
    const id = await addList({ name: newName.trim(), color: '#3b82f6', icon: 'List', isSmartList: false, filterConfig: null });
    setNewName(''); setShowNewInput(false); navigate(`/app/list/${id}`);
  };

  const userLists = useMemo(() => allLists.filter(l => !l.isSmartList), [allLists]);

  const counts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const active = tasks.filter((t) => !t.completedAt && t.status !== 'draft');
    return {
      today: active.filter((t) => t.dueDate === today).length,
      scheduled: active.filter((t) => t.dueDate !== null).length,
      all: active.length,
      allTotal: tasks.filter((t) => t.status !== 'draft').length,
      flagged: active.filter((t) => t.isFlagged).length,
      overdue: active.filter((t) => isOverdue(t.dueDate, t.dueTime)).length,
    };
  }, [tasks]);

  // Per-list stats
  const listStats = useMemo(() => {
    const map: Record<number, { active: number; overdue: number }> = {};
    for (const l of userLists) map[l.id!] = { active: 0, overdue: 0 };
    for (const t of tasks) {
      if (t.status === 'draft' || t.completedAt) continue;
      const s = map[t.listId]; if (s) { s.active++; if (isOverdue(t.dueDate, t.dueTime)) s.overdue++; }
    }
    return map;
  }, [userLists, tasks]);

  return (
    <div>
      {/* Header — aligned with sidebar items */}
      <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-gray-600 hover:bg-gray-200 transition-colors">
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${collapsed ? '-rotate-90' : 'rotate-0'}`} />
        <span className="flex-1 text-left">{t('smartLists')}</span>
        <span className="text-xs text-gray-400">{counts.allTotal}</span>
      </button>

      <div className={`grid transition-all duration-300 ease-out ${collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
        <div className="overflow-hidden">
          {/* Smart list items */}
          {ITEMS.map(({ type, icon: Icon, key, countColor }) => {
            const path = `/app/${type}`;
            const isActive = location.pathname === path;
            const count = type === 'all' ? counts.allTotal : counts[type];

            let badgeColor = '';
            if (count === 0 || type === 'all') badgeColor = 'bg-gray-300 text-gray-500';
            else if (countColor === 'red') badgeColor = 'bg-red-500 text-white';
            else badgeColor = 'bg-blue-500 text-white';

            return (
              <button key={type} onClick={() => navigate(path)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md mb-0.5 transition-colors ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-200'}`}>
                <Icon size={16} />
                <span className="flex-1 text-left">{t(key)}</span>
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${badgeColor}`}>{count}</span>
              </button>
            );
          })}

          {/* ── User lists with own collapsible header ── */}
          <div className="mt-1 pt-1 border-t border-gray-100">
            <div className="flex items-center gap-1 px-2 mb-1">
              <button onClick={() => setListsCollapsed(!listsCollapsed)} className="flex items-center gap-1 flex-1 min-w-0 cursor-pointer">
                <ChevronDown size={10} className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${listsCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                <span className="text-sm text-gray-600">{t('myLists')}</span>
                <span className="text-[9px] text-gray-300">{userLists.length}</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowNewInput(true); setListsCollapsed(false); }}
                className="p-0.5 rounded text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0">
                <Plus size={11} />
              </button>
            </div>
            {showNewInput && (
              <div className="flex gap-1 px-2 mt-1 mb-1 animate-slide-down">
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowNewInput(false); setNewName(''); } }}
                  placeholder={t('listNamePlaceholder')}
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-blue-400" autoFocus />
                <button onClick={handleCreate} disabled={!newName.trim()}
                  className="px-2 py-1 text-[11px] bg-blue-500 text-white rounded-md disabled:bg-gray-200 disabled:text-gray-400">确定</button>
              </div>
            )}
            <div className={`grid transition-all duration-300 ease-out ${listsCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
              <div className="overflow-hidden">
                {userLists.map(list => {
                  const path = `/app/list/${list.id}`;
                  const isActive = location.pathname === path;
                  const stats = listStats[list.id!] || { active: 0, overdue: 0 };
                  const dotColor = stats.active > 0 ? 'bg-blue-500' : 'bg-gray-300';
                  return (
                    <div key={list.id}
                      className={`group flex items-center gap-2 px-2 py-1.5 rounded-md mb-0.5 transition-colors ${isActive ? 'bg-blue-100' : 'hover:bg-gray-200'}`}>
                      <button onClick={() => navigate(path)}
                        className="flex-1 flex items-center gap-2 text-xs text-left min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                        <span className={`truncate ${isActive ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>{list.name}</span>
                        {stats.overdue > 0 && (
                          <span className="ml-auto flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-red-500 text-white">{stats.overdue}</span>
                        )}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: list.id!, name: list.name }); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                    </div>
                  );
                })}
                {userLists.length === 0 && !showNewInput && (
                  <p className="text-[10px] text-gray-400 px-2 py-1">{t('noCustomList')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog title={t('deleteListTitle')} message={t('deleteListConfirm', { name: deleteTarget.name })}
          onConfirm={() => { deleteList(deleteTarget.id); setDeleteTarget(null); navigate('/app/all'); }}
          onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
