import { useState, useEffect } from 'react';
import { db } from '../../db/database';
import type { Subtask } from '../../lib/types';
import { Plus, Check, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface SubTaskSectionProps {
  taskId: number;
  onChange?: () => void;
}

export function SubTaskSection({ taskId, onChange }: SubTaskSectionProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pendingComplete, setPendingComplete] = useState<Set<number>>(new Set());

  useEffect(() => { loadSubtasks(); }, [taskId]);

  const loadSubtasks = async () => {
    const items = await db.subtasks.where('taskId').equals(taskId).sortBy('sortOrder');
    setSubtasks(items);
  };

  const addSubtask = async () => {
    if (!newTitle.trim()) return;
    const maxOrder = subtasks.reduce((max, s) => Math.max(max, s.sortOrder), 0);
    await db.subtasks.add({ taskId, title: newTitle.trim(), completed: false, sortOrder: maxOrder + 1, dueDate: null, dueTime: null, notes: '', createdAt: new Date().toISOString() });
    setNewTitle(''); loadSubtasks(); onChange?.();
  };

  const handleCheck = async (s: Subtask) => {
    if (s.completed) {
      // Undo completion
      await db.subtasks.update(s.id!, { completed: false });
      setPendingComplete(prev => { const n = new Set(prev); n.delete(s.id!); return n; });
    } else if (pendingComplete.has(s.id!)) {
      // Second click: confirm complete
      await db.subtasks.update(s.id!, { completed: true });
      setPendingComplete(prev => { const n = new Set(prev); n.delete(s.id!); return n; });
    } else {
      // First click: mark as pending
      setPendingComplete(prev => new Set(prev).add(s.id!));
    }
    loadSubtasks(); onChange?.();
  };

  const updateSubtask = async (id: number, patch: Partial<Subtask>) => {
    await db.subtasks.update(id, patch);
    loadSubtasks(); onChange?.();
  };

  const deleteSubtask = async (id: number) => {
    await db.subtasks.delete(id);
    loadSubtasks(); onChange?.();
  };

  const completed = subtasks.filter((s) => s.completed).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500">
          子任务
          {subtasks.length > 0 && <span className="ml-2 text-xs text-gray-400">{completed}/{subtasks.length}</span>}
        </h3>
      </div>

      {subtasks.map((s) => (
        <div key={s.id} className="border border-gray-100 rounded-lg mb-2 overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
            <button onClick={() => handleCheck(s)}
              className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                s.completed ? 'bg-blue-500 border-blue-500' :
                pendingComplete.has(s.id!) ? 'bg-gray-300 border-gray-300' :
                'border-gray-300 hover:border-gray-400'
              }`}>
              {(s.completed || pendingComplete.has(s.id!)) && <Check size={10} className="text-white" />}
            </button>
            <span className={`flex-1 text-sm transition-colors duration-300 ${
              s.completed ? 'line-through text-gray-400' :
              pendingComplete.has(s.id!) ? 'line-through text-gray-400' :
              'text-gray-700'
            }`}>{s.title}</span>
            <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id!)}
              className="p-0.5 text-gray-400 hover:text-gray-600">
              {expandedId === s.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <button onClick={() => deleteSubtask(s.id!)} className="p-0.5 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
          </div>

          {/* Expanded detail */}
          {expandedId === s.id && (
            <div className="px-3 py-2 space-y-2 animate-slide-down">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 block mb-0.5">标题</label>
                  <input type="text" value={s.title} onChange={(e) => updateSubtask(s.id!, { title: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">日期</label>
                  <input type="date" value={s.dueDate || ''} onChange={(e) => updateSubtask(s.id!, { dueDate: e.target.value || null })}
                    className="w-28 px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">时间</label>
                  <input type="time" value={s.dueTime || ''} onChange={(e) => updateSubtask(s.id!, { dueTime: e.target.value || null })}
                    className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5">备注</label>
                <input type="text" value={s.notes || ''} onChange={(e) => updateSubtask(s.id!, { notes: e.target.value })}
                  placeholder="补充说明..."
                  className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add new */}
      <div className="flex gap-2">
        <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(); }}
          placeholder="添加子任务..."
          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <button onClick={addSubtask} disabled={!newTitle.trim()}
          className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
