import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTaskStore } from '../../stores/task-store';
import { useListStore } from '../../stores/list-store';
import { useTagStore } from '../../stores/tag-store';
import { useUIStore } from '../../stores/ui-store';
import { useT } from '../../lib/i18n';
import { SubTaskSection } from '../subtask/SubtaskSection';
import { PriorityBadge } from '../ui/PriorityBadge';
import { TagBadge } from '../ui/TagBadge';
import type { Priority } from '../../lib/types';
import { ArrowLeft, Flag, Calendar, AlertCircle, ChevronDown, ChevronRight, Save } from 'lucide-react';

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { t } = useT();
  const [showAdvancedDate, setShowAdvancedDate] = useState(false);

  const allTasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const loadAllTasks = useTaskStore((s) => s.loadAllTasks);
  const addToast = useUIStore((s) => s.addToast);

  const loadLists = useListStore((s) => s.loadLists);

  const allTags = useTagStore((s) => s.tags);
  const allTaskTags = useTagStore((s) => s.taskTags);
  const assignTag = useTagStore((s) => s.assignTag);
  const removeTag = useTagStore((s) => s.removeTag);

  const task = useMemo(
    () => (taskId && taskId !== 'new' ? allTasks.find((t) => t.id === Number(taskId)) ?? null : null),
    [allTasks, taskId]
  );
  const taskTags = useMemo(() => {
    if (!task) return [];
    const tagIds = allTaskTags.filter((tt) => tt.taskId === task.id).map((tt) => tt.tagId);
    return allTags.filter((t) => tagIds.includes(t.id!));
  }, [allTags, allTaskTags, task]);

  // ── Form state ──
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [isFlagged, setIsFlagged] = useState(false);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [subtaskChanged, setSubtaskChanged] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const addTag = useTagStore((s) => s.addTag);
  const TAG_COLORS = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

  useEffect(() => { loadAllTasks(); loadLists(); }, []);

  useEffect(() => {
    if (task) {
      setTitle(task.title); setNotes(task.notes); setPriority(task.priority);
      setIsFlagged(task.isFlagged);
      setDueDate(task.dueDate || '');
      setDateStart(task.dateStart || '');
      setDateEnd(task.dateEnd || '');
      setShowAdvancedDate(task.dateMode === 'advanced');
    }
  }, [task]);

  // ✅ 检测是否有修改
  const isModified = useMemo(() => {
    if (!task) return true; // new task always "modified"
    return (
      title !== task.title ||
      notes !== task.notes ||
      priority !== task.priority ||
      isFlagged !== task.isFlagged ||
      dueDate !== (task.dueDate || '') ||
      dateStart !== (task.dateStart || '') ||
      dateEnd !== (task.dateEnd || '') ||
      subtaskChanged
    );
  }, [task, title, notes, priority, isFlagged, dueDate, subtaskChanged]);

  const handleSave = () => {
    if (!task) return;
    updateTask(task.id!, {
      ...task,
      title: title.trim() || task.title,
      notes,
      priority,
      isFlagged,
      dueDate: dueDate || null,
      dateStart: dateStart || null,
      dateEnd: dateEnd || null,
      updatedAt: new Date().toISOString(),
    });
    setSubtaskChanged(false);
    addToast('已保存 ✅', 'success');
    navigate(-1);
  };

  if (!task) {
    return (
      <div className="text-center py-20 text-gray-400">任务不存在</div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-md text-gray-500"><ArrowLeft size={20} /></button>
        <div className="flex-1" />
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${task.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
          {task.status === 'draft' ? '📝 草稿' : '✅ 已保存'}
        </span>
      </div>

      {/* ── TITLE ── */}
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder={t('taskTitle')}
        className="w-full text-2xl font-bold text-gray-900 border-none outline-none mb-6 placeholder-gray-300" />

      {/* ── PROPERTIES ROW ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-1">
          <AlertCircle size={16} className="text-gray-400" />
          {(['high','medium','low'] as Priority[]).map(p => (
            <button key={p} onClick={() => setPriority(p)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${priority === p ? 'bg-white shadow-sm ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
              <PriorityBadge priority={p} />
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-gray-300" />
        <button onClick={() => setIsFlagged(!isFlagged)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${isFlagged ? 'text-orange-600 bg-orange-50' : 'text-gray-400 hover:text-gray-600'}`}>
          <Flag size={14} fill={isFlagged ? 'currentColor' : 'none'} /> {t('flag')}
        </button>
      </div>

      {/* ── DATE ── */}
      <div className="mb-5 p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Calendar size={16} /> 截止日期</h3>
          <button onClick={() => setShowAdvancedDate(!showAdvancedDate)}
            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
            {showAdvancedDate ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {showAdvancedDate ? '收起高级选项' : '高级日期设置'}
          </button>
        </div>
        {!showAdvancedDate && (
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
        )}
        {showAdvancedDate && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">📅 开始日期</label><input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">🏁 结束日期</label><input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
            </div>
          </div>
        )}
      </div>

      {/* ── TAGS ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {taskTags.map(tag => (
          <TagBadge key={tag.id} name={tag.name} color={tag.color} onRemove={() => { removeTag(task.id!, tag.id!); setSubtaskChanged(true); }} />
        ))}
        {/* Create new tag */}
        <div className="flex items-center gap-1">
          <input
            type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && newTagName.trim()) {
                const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
                const id = await addTag(newTagName.trim(), color);
                await assignTag(task.id!, id);
                setNewTagName('');
                setSubtaskChanged(true);
              }
            }}
            placeholder="+ 添加标签"
            className="w-20 px-2 py-0.5 text-xs border border-dashed border-gray-300 rounded bg-transparent outline-none focus:border-blue-400 placeholder-gray-400"
          />
        </div>
        {/* Existing tags dropdown */}
        {allTags.filter(t => !taskTags.find(tt => tt.id === t.id)).length > 0 && (
          <select value="" onChange={async (e) => { const id = Number(e.target.value); if (id) { await assignTag(task.id!, id); setSubtaskChanged(true); } }}
            className="text-xs bg-transparent border border-dashed border-gray-300 rounded px-2 py-0.5 outline-none text-gray-400 cursor-pointer">
            <option value="">{t('addTag')}</option>
            {allTags.filter(t => !taskTags.find(tt => tt.id === t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {/* ── NOTES ── */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('notes')}</h3>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('notesPlaceholder')} rows={5}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y" />
      </div>

      {/* ── SUBTASKS ── */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg">
        <SubTaskSection taskId={task.id!} onChange={() => setSubtaskChanged(true)} />
      </div>

      {/* ── SAVE ── */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={handleSave} disabled={!isModified}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all duration-200 ${
            isModified ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}>
          <Save size={16} /> 保存
        </button>
        <button onClick={() => navigate(-1)} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700">返回</button>
      </div>
    </div>
  );
}
