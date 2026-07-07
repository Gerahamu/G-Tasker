import { useState, useEffect } from 'react';
import { useMemoStore } from '../../stores/memo-store';
import { useT } from '../../lib/i18n';
import { useUIStore } from '../../stores/ui-store';
import { Pin, Plus, X } from 'lucide-react';
import type { Memo } from '../../lib/types';

export function MemoPage() {
  const { t } = useT();
  const { memos, isLoading, loadMemos, addMemo, updateMemo, deleteMemo, togglePin } = useMemoStore();
  const addToast = useUIStore((s) => s.addToast);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => { loadMemos(); }, [loadMemos]);

  const resetForm = () => { setTitle(''); setContent(''); setEditingId(null); setShowCreate(false); };

  const handleCreate = async () => {
    if (!title.trim() && !content.trim()) return;
    const now = new Date().toISOString();
    await addMemo({
      title: title.trim() || content.trim().slice(0, 20) || '无标题',
      content: content.trim(),
      pinned: false, tags: '[]',
      createdAt: now, updatedAt: now,
    });
    addToast(t('memoCreated'), 'success');
    // ✅ 创建后保留面板，仅清空输入
    setTitle('');
    setContent('');
  };

  const handleSave = async (id: number) => {
    if (!title.trim() && !content.trim()) return;
    await updateMemo(id, {
      title: title.trim() || content.trim().slice(0, 20) || '无标题',
      content: content.trim(),
    });
    addToast('已保存', 'success');
    resetForm();
  };

  const startEdit = (m: Memo) => {
    setEditingId(m.id!);
    setTitle(m.title); setContent(m.content);
    setShowCreate(false);
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    await deleteMemo(deleteId);
    setDeleteId(null);
    addToast('已删除', 'success');
    if (editingId === deleteId) resetForm();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div />
        <button onClick={() => { resetForm(); setShowCreate(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
          <Plus size={16} /> {t('newMemo')}
        </button>
      </div>

      {/* ── Create / Edit Panel ── */}
      {(showCreate || editingId != null) && (
        <div className="mb-6 p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm animate-modal-in space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{editingId ? t('editMemo') : t('newMemo')}</span>
            <button onClick={resetForm} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400"><X size={16} /></button>
          </div>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="标题（可选，留空取内容前20字）"
            className="w-full text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none placeholder-gray-300" autoFocus />
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="写点什么..."
            rows={5}
            className="w-full px-0 py-2 text-sm text-gray-700 dark:text-gray-300 bg-transparent border-none outline-none resize-y placeholder-gray-300" />
          <div className="flex gap-2">
            <button onClick={editingId ? () => handleSave(editingId) : handleCreate}
              className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
              {editingId ? '保存' : '创建'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">取消</button>
          </div>
        </div>
      )}

      {/* ── Memo List ── */}
      {memos.length === 0 && !showCreate && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-sm">{t('memoEmpty')}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {memos.map((m) => (
          <div key={m.id}
            className={`group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all cursor-pointer animate-scale-in ${
              m.pinned ? 'ring-1 ring-amber-300' : ''
            }`}
            onClick={() => startEdit(m)}>
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-1 flex-1">{m.title}</h4>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <button onClick={(e) => { e.stopPropagation(); togglePin(m.id!); }}
                  className={`p-1 rounded transition-colors ${m.pinned ? 'text-amber-500' : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-400'}`}>
                  <Pin size={14} fill={m.pinned ? 'currentColor' : 'none'} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteId(m.id!); }}
                  className="p-1 rounded text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-3 whitespace-pre-wrap">
              {m.content.slice(0, 120)}{m.content.length > 120 ? '...' : ''}
            </p>
            <p className="text-[10px] text-gray-300">
              {new Date(m.updatedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ))}
      </div>

      {/* ── Delete Confirm ── */}
      {deleteId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 animate-modal-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">{t('delMemo')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('delMemoConfirm')}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">取消</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
