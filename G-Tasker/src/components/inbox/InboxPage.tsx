import { useState, useEffect } from 'react';
import { db } from '../../db/database';
import { useTaskStore } from '../../stores/task-store';
import { useMemoStore } from '../../stores/memo-store';
import { useT } from '../../lib/i18n'; import { useUIStore } from '../../stores/ui-store';
import { Plus, Trash2, ArrowRight, Lightbulb } from 'lucide-react';
import type { InboxItem } from '../../lib/types';

export function InboxPage() {
  const { t } = useT();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [title, setTitle] = useState('');
  const [showInput, setShowInput] = useState(false);
  const addTask = useTaskStore((s) => s.addTask);
  const addMemo = useMemoStore((s) => s.addMemo);
  const loadMemos = useMemoStore((s) => s.loadMemos);
  const loadAllTasks = useTaskStore((s) => s.loadAllTasks);
  const addToast = useUIStore((s) => s.addToast);

  const load = async () => {
    const all = await db.inboxItems.orderBy('createdAt').reverse().toArray();
    setItems(all);
  };

  useEffect(() => { load(); }, []);

  const addItem = async () => {
    if (!title.trim()) return;
    await db.inboxItems.add({ title: title.trim(), content: '', status: 'unprocessed', createdAt: new Date().toISOString() });
    setTitle(''); setShowInput(false);
    addToast(t('inboxAdded'), 'success');
    load();
  };

  const deleteItem = async (id: number) => {
    await db.inboxItems.delete(id);
    load();
  };

  const convertToTask = async (item: InboxItem) => {
    await addTask({
      listId: (await db.taskLists.toArray())[0]?.id || 0,
      title: item.title, notes: item.content || '', priority: 'medium', isFlagged: false,
      dueDate: null, dueTime: null, completedAt: null,
      recurrenceRuleId: null, parentTaskId: null, locationTriggerId: null, templateId: null,
      sortOrder: 0, dateMode: 'simple', dateStart: null, dateEnd: null, dateTarget: null,
      milestones: '[]', status: 'active',
    });
    await db.inboxItems.update(item.id!, { status: 'converted' });
    loadAllTasks();
    addToast(t('convertedTask'), 'success');
    load();
  };

  const convertToMemo = async (item: InboxItem) => {
    const now = new Date().toISOString();
    await addMemo({ title: item.title, content: item.content || '', pinned: false, tags: '[]', createdAt: now, updatedAt: now });
    await db.inboxItems.update(item.id!, { status: 'converted' });
    loadMemos();
    addToast(t('convertedMemo'), 'success');
    load();
  };

  const unprocessed = items.filter(i => i.status === 'unprocessed');

  return (
    <div className="max-w-2xl mx-auto">
      {/* Quick add — always visible, large */}
      {!showInput ? (
        <button onClick={() => setShowInput(true)}
          className="w-full mb-6 py-4 bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl text-amber-600 hover:bg-amber-100 hover:border-amber-400 transition-all text-base font-medium flex items-center justify-center gap-2 shadow-sm">
          <Plus size={22} /> {t('recordIdea')}
        </button>
      ) : (
        <div className="mb-6 p-5 bg-amber-50 rounded-2xl border-2 border-amber-300 animate-modal-in">
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') { setShowInput(false); setTitle(''); } }}
            placeholder={t('recordPlaceholder')}
            className="w-full px-4 py-3 text-base border border-amber-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            autoFocus
          />
          <div className="flex gap-3 mt-3">
            <button onClick={addItem} disabled={!title.trim()}
              className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">记录</button>
            <button onClick={() => { setShowInput(false); setTitle(''); }}
              className="px-6 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
          </div>
        </div>
      )}

      {/* Items */}
      {unprocessed.length === 0 && !showInput && (
        <div className="text-center py-16 text-gray-400">
          <Lightbulb size={48} className="mx-auto mb-3 text-amber-300" />
          <p className="text-sm">{t('inboxEmpty')}</p>
        </div>
      )}

      <div className="space-y-2">
        {unprocessed.map(item => (
          <div key={item.id} className="group flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-300 transition-colors">
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{item.title}</span>
            <span className="text-[10px] text-gray-400">{new Date(item.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => convertToTask(item)}
                className="px-2 py-1 text-[10px] bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center gap-1"
                title="转为任务">
                <ArrowRight size={10} /> 任务
              </button>
              <button onClick={() => convertToMemo(item)}
                className="px-2 py-1 text-[10px] bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 flex items-center gap-1"
                title="转为备忘录">
                <ArrowRight size={10} /> 备忘录
              </button>
              <button onClick={() => deleteItem(item.id!)}
                className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
