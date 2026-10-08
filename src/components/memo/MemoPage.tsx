import { useState, useEffect, useRef } from 'react';
import { useMemoStore } from '../../stores/memo-store';
import { useT } from '../../lib/i18n';
import { useUIStore } from '../../stores/ui-store';
import { Pin, Plus, X } from 'lucide-react';
import type { Memo } from '../../lib/types';

export function MemoPage() {
  const { t } = useT();
  const { memos, isLoading, loadMemos, addMemo, updateMemo, deleteMemo, togglePin } =
    useMemoStore();
  const addToast = useUIStore((s) => s.addToast);
  const setShowCreateModal = useUIStore((s) => s.setShowCreateModal);
  const setCreateTaskRequest = useUIStore((s) => s.setCreateTaskRequest);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const editorOpenRef = useRef(false);
  const isEditorOpen = showCreate || editingId != null;

  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  const resetForm = () => {
    editorOpenRef.current = false;
    setTitle('');
    setContent('');
    setEditingId(null);
    setShowCreate(false);
  };

  const startCreate = () => {
    if (editorOpenRef.current || showCreate || editingId != null) return;
    editorOpenRef.current = true;
    setTitle('');
    setContent('');
    setEditingId(null);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!title.trim() && !content.trim()) return;
    const now = new Date().toISOString();
    await addMemo({
      title: title.trim() || content.trim().slice(0, 20) || t('untitled'),
      content: content.trim(),
      pinned: false,
      tags: '[]',
      createdAt: now,
      updatedAt: now,
    });
    addToast(t('memoCreated'), 'success');
    resetForm();
  };

  const handleSave = async (id: number) => {
    if (!title.trim() && !content.trim()) return;
    await updateMemo(id, {
      title: title.trim() || content.trim().slice(0, 20) || t('untitled'),
      content: content.trim(),
    });
    addToast(t('savedToast'), 'success');
    resetForm();
  };

  const startEdit = (m: Memo) => {
    editorOpenRef.current = true;
    setEditingId(m.id!);
    setTitle(m.title);
    setContent(m.content);
    setShowCreate(false);
  };

  const handleAddToTask = () => {
    if (editingId == null) return;
    const memoId = editingId;
    const taskTitle = title.trim() || content.trim().slice(0, 20) || t('untitled');
    setCreateTaskRequest({
      initialTitle: taskTitle,
      onCreated: async () => {
        await deleteMemo(memoId);
        resetForm();
      },
    });
    setShowCreateModal(true);
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    await deleteMemo(deleteId);
    setDeleteId(null);
    addToast(t('deletedToast'), 'success');
    if (editingId === deleteId) resetForm();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="memo-page">
      <div className="memo-actions">
        <button
          type="button"
          onClick={startCreate}
          disabled={isEditorOpen}
          aria-disabled={isEditorOpen}
          className="btn btn-primary memo-create-trigger"
        >
          <Plus size={16} /> {t('newMemo')}
        </button>
      </div>

      {/* ── Create / Edit Panel ── */}
      {(showCreate || editingId != null) && (
        <div className="memo-editor animate-modal-in space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {editingId ? t('editMemo') : t('newMemo')}
            </span>
            <button
              onClick={resetForm}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400"
            >
              <X size={16} />
            </button>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('memoTitleOptional')}
            className="w-full text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none placeholder-gray-300"
            autoFocus
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('memoContentPlaceholder')}
            rows={5}
            className="w-full px-0 py-2 text-sm text-gray-700 dark:text-gray-300 bg-transparent border-none outline-none resize-none placeholder-gray-300"
          />
          <div className="memo-editor-actions">
            <div className="flex gap-2">
              <button
                onClick={editingId ? () => handleSave(editingId) : handleCreate}
                className="btn btn-primary navbar-create memo-save-button"
              >
                {editingId ? t('saveBtn') : t('createBtn2')}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                {t('cancelBtn')}
              </button>
            </div>
            {editingId != null && (
              <button
                type="button"
                onClick={handleAddToTask}
                className="btn btn-secondary memo-add-task-button"
              >
                <Plus size={15} />
                {t('addToTask')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Memo List ── */}
      {memos.length === 0 && !showCreate && (
        <div className="empty-state">
          <div className="empty-state-mark" aria-hidden="true" />
          <p>{t('memoEmpty')}</p>
        </div>
      )}

      <div className="memo-grid">
        {memos.map((m) => (
          <div
            key={m.id}
            className={`memo-card group animate-scale-in ${m.pinned ? 'is-pinned' : ''}`}
            onClick={() => startEdit(m)}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-1 flex-1">
                {m.title}
              </h4>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(m.id!);
                  }}
                  className={`p-1 rounded transition-colors ${m.pinned ? 'text-amber-500' : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-400'}`}
                >
                  <Pin size={14} fill={m.pinned ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(m.id!);
                  }}
                  className="p-1 rounded text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-3 whitespace-pre-wrap">
              {m.content.slice(0, 120)}
              {m.content.length > 120 ? '...' : ''}
            </p>
            <p className="memo-card-time text-xs text-gray-300">
              {new Date(m.updatedAt).toLocaleString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        ))}
      </div>

      {/* ── Delete Confirm ── */}
      {deleteId != null && (
        <div className="modal-backdrop memo-delete-backdrop animate-fade-in" onClick={() => setDeleteId(null)}>
          <div
            className="modal-panel p-6 max-w-sm animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">{t('delMemo')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('delMemoConfirm')}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="btn btn-secondary">
                {t('cancelBtn')}
              </button>
              <button onClick={handleDelete} className="btn btn-danger">
                {t('deleteBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
