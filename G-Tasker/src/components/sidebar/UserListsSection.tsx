import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useListStore } from '../../stores/list-store';
import { useTaskStore } from '../../stores/task-store';
import { useT } from '../../lib/i18n';
import { isOverdue } from '../../lib/format-date';
import { Trash2, GripVertical, ChevronDown, Plus } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export function UserListsSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useT();
  const allLists = useListStore((s) => s.lists);
  const lists = useMemo(() => allLists.filter((l) => !l.isSmartList), [allLists]);
  const allTasks = useTaskStore((s) => s.tasks);
  const addList = useListStore((s) => s.addList);
  const deleteList = useListStore((s) => s.deleteList);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');

  // ✅ 每个列表的任务状态统计
  const listStats = useMemo(() => {
    const map: Record<number, { active: number; overdue: number }> = {};
    for (const l of lists) map[l.id!] = { active: 0, overdue: 0 };
    for (const t of allTasks) {
      if (t.status === 'draft' || t.completedAt) continue;
      const s = map[t.listId];
      if (s) {
        s.active++;
        if (isOverdue(t.dueDate, t.dueTime)) s.overdue++;
      }
    }
    return map;
  }, [lists, allTasks]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const dup = lists.find(l => l.name === newName.trim());
    if (dup) { setNewName(''); setShowNewInput(false); navigate(`/app/list/${dup.id}`); return; }
    const id = await addList({ name: newName.trim(), color: '#3b82f6', icon: 'List', isSmartList: false, filterConfig: null });
    setNewName(''); setShowNewInput(false);
    navigate(`/app/list/${id}`);
  };

  return (
    <div>
      {/* 标题栏：折叠 + 名称 + 数量 + 添加按钮 */}
      <div className="flex items-center gap-1 px-2 mb-2">
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer">
          <ChevronDown size={12} className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${collapsed ? '-rotate-90' : 'rotate-0'}`} />
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">{t('myLists')}</h2>
          {lists.length > 0 && <span className="text-[10px] text-gray-300 flex-shrink-0">{lists.length}</span>}
        </button>
        <button onClick={() => { setShowNewInput(true); setCollapsed(false); }}
          className="p-0.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors flex-shrink-0"
          title={t('newList')}>
          <Plus size={14} />
        </button>
      </div>

      {/* 新建列表输入 */}
      {showNewInput && (
        <div className="px-2 mb-2 flex gap-1 animate-slide-down">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowNewInput(false); setNewName(''); } }}
            placeholder={t('listNamePlaceholder')}
            className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-blue-400"
            autoFocus />
          <button onClick={handleCreate} disabled={!newName.trim()}
            className="px-2 py-1 text-[11px] bg-blue-500 text-white rounded-md disabled:bg-gray-200 disabled:text-gray-400">确定</button>
        </div>
      )}

      {lists.length === 0 && !showNewInput && (
        <p className="text-xs text-gray-400 px-2 py-4 text-center">{t('noCustomList')}</p>
      )}

      {/* 列表项：grid-rows 动画折叠 */}
      <div
        className={`grid transition-all duration-300 ease-out ${
          collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
        }`}
      >
        <div className="overflow-hidden">
          {lists.map((list) => {
            const path = `/app/list/${list.id}`;
            const isActive = location.pathname === path;
            const stats = listStats[list.id!] || { active: 0, overdue: 0 };
            const dotColor = stats.active > 0 ? 'bg-blue-500' : 'bg-gray-300';
            return (
              <div
                key={list.id}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-md mb-0.5 transition-colors ${
                  isActive ? 'bg-blue-100' : 'hover:bg-gray-200'
                }`}
              >
                <GripVertical size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                <button
                  onClick={() => navigate(path)}
                  className="flex-1 flex items-center gap-2 text-sm text-left min-w-0"
                >
                  {/* ✅ 蓝点=有未完成 / 灰点=全部完成 */}
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                  <span className={`truncate ${isActive ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                    {list.name}
                  </span>
                  {/* ✅ 红色逾期警报 */}
                  {stats.overdue > 0 && (
                    <span className="ml-auto flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-red-500 text-white">
                      {stats.overdue}
                    </span>
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: list.id!, name: list.name }); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                  title="删除列表">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title={t('deleteListTitle')}
          message={t('deleteListConfirm', { name: deleteTarget.name })}
          onConfirm={() => {
            deleteList(deleteTarget.id);
            setDeleteTarget(null);
            navigate('/app/all');
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
