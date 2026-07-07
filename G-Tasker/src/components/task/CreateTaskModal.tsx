import { useState, useEffect, useMemo } from 'react';
import { useTaskStore } from '../../stores/task-store';
import { useListStore } from '../../stores/list-store';
import { useUIStore } from '../../stores/ui-store';
import { useT } from '../../lib/i18n';
import type { Priority, Task } from '../../lib/types';
import { useTagStore } from '../../stores/tag-store';
import { X, Flag, Clock, Settings } from 'lucide-react';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: Priority; key: string; color: string; bg: string; ring: string }[] = [
  { value: 'high', key: 'priorityHigh', color: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-400' },
  { value: 'medium', key: 'priorityMedium', color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-400' },
  { value: 'low', key: 'priorityLow', color: 'text-gray-500', bg: 'bg-gray-100', ring: 'ring-gray-300' },
];

export function CreateTaskModal({ open, onClose }: CreateTaskModalProps) {
  const { t } = useT();
  const addTask = useTaskStore((s) => s.addTask);
  const addToast = useUIStore((s) => s.addToast);
  const presetListId = useUIStore((s) => s.presetListId);
  const allLists = useListStore((s) => s.lists);
  const loadLists = useListStore((s) => s.loadLists);
  const userLists = useMemo(() => allLists.filter((l) => !l.isSmartList), [allLists]);
  const addList = useListStore((s) => s.addList);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    const dup = userLists.find(l => l.name === newListName.trim());
    if (dup) { setListId(dup.id!); }
    else { const id = await addList({ name: newListName.trim(), color: '#3b82f6', icon: 'List', isSmartList: false, filterConfig: null }); setListId(id as number); }
    setNewListName(''); setShowNewList(false);
  };

  // ✅ 标签
  const allTags = useTagStore((s) => s.tags);
  const loadTags = useTagStore((s) => s.loadTags);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  // ✅ 读取设置中的默认值
  const defaultP = (() => { try { return JSON.parse(localStorage.getItem('task-default-priority') || '"medium"'); } catch { return 'medium'; } })();
  const defaultDue = (() => { try { return JSON.parse(localStorage.getItem('task-default-due') || 'false'); } catch { return false; } })();
  const todayStr = new Date().toISOString().slice(0, 10);

  // ── Form state ──
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>(defaultP);
  const [isFlagged, setIsFlagged] = useState(false);
  const [listId, setListId] = useState(0);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  // Advanced
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateStart, setDateStart] = useState('');
  const [dateStartTime, setDateStartTime] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [dateEndTime, setDateEndTime] = useState('');
  const [showDueTime, setShowDueTime] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);

  useEffect(() => { loadLists(); loadTags(); }, [loadLists, loadTags]);
  useEffect(() => {
    if (userLists.length > 0 && listId === 0) setListId(presetListId || userLists[0].id!);
  }, [userLists, listId]);

  useEffect(() => {
    if (open) {
      // ✅ 每次打开时刷新标签列表
      loadTags();
      setTitle(''); setPriority(defaultP); setIsFlagged(false); setNotes('');
      setDueDate(defaultDue ? todayStr : ''); setDueTime(''); setDateStart(''); setDateStartTime('');
      setDateEnd(''); setDateEndTime('');
      setShowDueTime(false); setShowStartTime(false); setShowEndTime(false);
      setShowAdvanced(false); setSelectedTags([]);
      if (userLists.length > 0) setListId(presetListId || userLists[0].id!);
    }
  }, [open]);

  // ── Save ──
  const buildPayload = (status: 'active' | 'draft'): Omit<Task, 'id'> => ({
    listId: listId || (userLists[0]?.id ?? 0),
    title: title.trim() || '未命名任务',
    notes, priority, isFlagged,
    dueDate: showAdvanced ? (dateEnd || null) : (dueDate || null),
    dueTime: showAdvanced ? (dateEndTime || null) : (dueTime || null),
    completedAt: null, recurrenceRuleId: null, parentTaskId: null,
    locationTriggerId: null, templateId: null, sortOrder: 0,
    dateMode: showAdvanced ? 'advanced' : 'simple',
    dateStart: showAdvanced ? (dateStart + (dateStartTime ? 'T' + dateStartTime : '') || null) : null,
    dateEnd: showAdvanced ? (dateEnd + (dateEndTime ? 'T' + dateEndTime : '') || null) : null,
    dateTarget: null,
    milestones: '[]',
    status, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  const hasTitle = title.trim().length > 0;

  const handleSave = async (status: 'active' | 'draft') => {
    if (status === 'active' && !hasTitle) {
      addToast('⚠️ 请输入任务标题', 'error');
      return;
    }
    const id = await addTask(buildPayload(status));
    // ✅ Assign selected tags
    for (const tagId of selectedTags) {
      await useTagStore.getState().assignTag(id as number, tagId);
    }
    const name = title.trim() || '未命名任务';
    addToast(status === 'draft' ? `📝 「${name}」已存草稿` : `✅ 「${name}」已创建`, 'success');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[3vh] bg-black/30 overflow-y-auto animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 my-6 animate-modal-in" onClick={(e) => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">新建任务</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => { const next = !showAdvanced; setShowAdvanced(next); if (!next) { setDateStart(''); setDateStartTime(''); setDateEnd(''); setDateEndTime(''); } }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                showAdvanced ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-100'
              }`}>
              <Settings size={13} /> 高级
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* ── 1. TITLE ── */}
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="任务标题"
            className="w-full text-lg font-semibold text-gray-900 border-b-2 border-gray-100 pb-2 outline-none placeholder-gray-300 focus:border-blue-400 transition-colors"
            autoFocus
          />

          {/* ── 2. PRIORITY ── */}
          <div>
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">优先级</label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(p => (
                <button key={p.value} onClick={() => setPriority(p.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    priority === p.value
                      ? `${p.bg} border-${p.value === 'high' ? 'red' : p.value === 'medium' ? 'amber' : 'gray'}-300 ${p.color} ring-1 ${p.ring}`
                      : 'border-gray-150 text-gray-400 hover:bg-gray-50'
                  }`}>
                  {p.value === "high" ? "🔴" : p.value === "medium" ? "🟡" : "⚪"} {t(p.key)}
                </button>
              ))}
              <button onClick={() => setIsFlagged(!isFlagged)}
                className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                  isFlagged ? 'bg-orange-50 border-orange-300 text-orange-600' : 'border-gray-150 text-gray-400 hover:bg-gray-50'
                }`} title="标记">
                <Flag size={14} fill={isFlagged ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {/* ── 3. DATE — 开启高级后自动隐藏 ── */}
          {!showAdvanced && (
          <div>
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">截止日期</label>
            <div className="flex gap-1.5 items-center">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button onClick={() => setShowDueTime(!showDueTime)}
                className={`p-2 rounded-lg border transition-all duration-150 flex-shrink-0 ${showDueTime || dueTime ? 'border-blue-300 bg-blue-50 text-blue-500' : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'}`}
                title={showDueTime ? '收起时间' : '设定时间'}>
                <Clock size={16} />
              </button>
              {showDueTime && (
                <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
                  className="w-28 px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 animate-slide-right"
                  autoFocus />
              )}
            </div>
          </div>
          )}

          {/* ── 4. LIST ── */}
          <div>
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">所属列表</label>
            {showNewList ? (
              <div className="flex gap-1.5">
                <input type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateList(); if (e.key === 'Escape') { setShowNewList(false); setNewListName(''); } }}
                  placeholder="新列表名称" className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" autoFocus />
                <button onClick={handleCreateList} disabled={!newListName.trim()}
                  className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg disabled:bg-gray-200">创建</button>
                <button onClick={() => { setShowNewList(false); setNewListName(''); }}
                  className="px-3 py-1.5 text-xs text-gray-500">取消</button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <select value={listId} onChange={(e) => { const v = Number(e.target.value); if (v === -1) { setShowNewList(true); return; } setListId(v); }}
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-600">
                  {userLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button onClick={() => setShowNewList(true)}
                  className="px-2 py-1.5 text-xs border border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors">+ 新建列表</button>
              </div>
            )}
          </div>

          {/* ── 5. TAGS ── */}
          <div>
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">标签</label>
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {/* Selected tags */}
              {selectedTags.map(tagId => {
                const tag = allTags.find(t => t.id === tagId);
                if (!tag) return null;
                return (
                  <button key={tagId} onClick={() => setSelectedTags(selectedTags.filter(id => id !== tagId))}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium hover:opacity-80"
                    style={{ backgroundColor: tag.color + '18', color: tag.color }}>#{tag.name} ×</button>
                );
              })}
              {/* Select from existing tags — use a real select for reliability */}
              <select
                value=""
                onChange={(e) => {
                  const id = Number(e.target.value);
                  if (id && !selectedTags.includes(id)) setSelectedTags([...selectedTags, id]);
                }}
                className="text-[10px] border border-dashed border-gray-300 rounded px-1.5 py-0.5 outline-none text-gray-400 bg-transparent cursor-pointer"
              >
                <option value="">+ 选择</option>
                {allTags.filter(t => !selectedTags.includes(t.id!)).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── 5. DESCRIPTION ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">简介</label>
              <span className={`text-[10px] ${notes.length > 20 ? 'text-red-400' : 'text-gray-300'}`}>{notes.length}/20</span>
            </div>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="一句话描述（20字以内）"
              maxLength={20}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* ── ADVANCED SETTINGS ── */}
          {/* ── 高级面板：grid-rows 动画实现丝滑展开/收起 ── */}
          <div className={`grid transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            showAdvanced ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}>
            <div className="overflow-hidden">
              <div className={`space-y-4 pt-2 border-t border-gray-100 transition-all duration-400 delay-75 ${
                showAdvanced ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
              }`}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">高级设置</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500 mb-0.5 block">📅 开始时间</label>
                  <div className="flex gap-1 items-center">
                    <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <button onClick={() => setShowStartTime(!showStartTime)}
                      className={`p-1.5 rounded-lg border transition-all duration-150 flex-shrink-0 ${showStartTime || dateStartTime ? 'border-blue-300 bg-blue-50 text-blue-500' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                      <Clock size={14} />
                    </button>
                    {showStartTime && (
                      <input type="time" value={dateStartTime} onChange={(e) => setDateStartTime(e.target.value)}
                        className="w-24 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 animate-slide-right" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-0.5 block">🏁 结束时间</label>
                  <div className="flex gap-1 items-center">
                    <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <button onClick={() => setShowEndTime(!showEndTime)}
                      className={`p-1.5 rounded-lg border transition-all duration-150 flex-shrink-0 ${showEndTime || dateEndTime ? 'border-blue-300 bg-blue-50 text-blue-500' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                      <Clock size={14} />
                    </button>
                    {showEndTime && (
                      <input type="time" value={dateEndTime} onChange={(e) => setDateEndTime(e.target.value)}
                        className="w-24 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 animate-slide-right" />
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-gray-300 italic">创建任务后可在任务详情中添加带日期和备注的子任务/中间目标</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2.5">
          <button onClick={() => handleSave('active')}
            disabled={!hasTitle}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] ${
              hasTitle
                ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            创建任务
          </button>
          <button onClick={() => handleSave('draft')}
            className="px-5 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-200 active:scale-[0.98] transition-all duration-150">
            存草稿
          </button>
        </div>
      </div>
    </div>
  );
}
