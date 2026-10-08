import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
import { Check, Minus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { useUIStore } from '../../stores/ui-store';
import {
  createTagForTasks,
  deleteTaskTag,
  loadTaskTagSnapshot,
  renameTaskTag,
  toggleTagForTasks,
} from '../../db/task-tags';
import { FloatingLayer } from '../ui/FloatingLayer';

const PICKER_COPY = {
  zh: {
    search: '搜索标签',
    clearSearch: '清除搜索',
    create: '创建并添加',
    none: '没有匹配的标签',
    partial: '部分任务已有',
    deletePrompt: '删除此标签及其任务关联？任务本身不会删除。',
    rename: '重命名标签',
    delete: '删除标签',
    confirm: '删除',
  },
  en: {
    search: 'Search tags',
    clearSearch: 'Clear search',
    create: 'Create and add',
    none: 'No matching tags',
    partial: 'Some selected tasks have this',
    deletePrompt: 'Delete this tag and its task links? Tasks will remain.',
    rename: 'Rename tag',
    delete: 'Delete tag',
    confirm: 'Delete',
  },
  ja: {
    search: 'タグを検索',
    clearSearch: '検索をクリア',
    create: '作成して追加',
    none: '一致するタグがありません',
    partial: '一部のタスクに設定済み',
    deletePrompt: 'このタグと関連付けを削除しますか？タスクは削除されません。',
    rename: 'タグ名を変更',
    delete: 'タグを削除',
    confirm: '削除',
  },
} as const;

interface TaskTagPickerProps {
  open: boolean;
  taskIds: number[];
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
}

export function TaskTagPicker({
  open,
  taskIds,
  anchorRef,
  onClose,
  onChanged,
}: TaskTagPickerProps) {
  const { t, lang } = useT();
  const copy = PICKER_COPY[lang];
  const addToast = useUIStore((state) => state.addToast);
  const stableTaskIds = useMemo(() => [...new Set(taskIds)], [taskIds]);
  const [tags, setTags] = useState<Array<{ id?: number; name: string; color: string }>>([]);
  const [assignedTaskIds, setAssignedTaskIds] = useState<Map<number, Set<number>>>(new Map());
  const [query, setQuery] = useState('');
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleteCandidateId, setDeleteCandidateId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const snapshot = await loadTaskTagSnapshot(stableTaskIds);
    const assignments = new Map<number, Set<number>>();
    for (const relation of snapshot.relations) {
      const taskSet = assignments.get(relation.tagId) ?? new Set<number>();
      taskSet.add(relation.taskId);
      assignments.set(relation.tagId, taskSet);
    }
    setTags(snapshot.tags.sort((left, right) => left.name.localeCompare(right.name)));
    setAssignedTaskIds(assignments);
  }, [stableTaskIds]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void loadTaskTagSnapshot(stableTaskIds)
      .then((snapshot) => {
        if (!active) return;
        const assignments = new Map<number, Set<number>>();
        for (const relation of snapshot.relations) {
          const taskSet = assignments.get(relation.tagId) ?? new Set<number>();
          taskSet.add(relation.taskId);
          assignments.set(relation.tagId, taskSet);
        }
        setTags(snapshot.tags.sort((left, right) => left.name.localeCompare(right.name)));
        setAssignedTaskIds(assignments);
      })
      .catch(() => addToast(t('operationFailed'), 'error'));
    return () => {
      active = false;
    };
  }, [addToast, open, stableTaskIds, t]);

  const refreshAfterChange = async () => {
    await refresh();
    await onChanged?.();
  };

  const closePicker = () => {
    setQuery('');
    setRenamingId(null);
    setDeleteCandidateId(null);
    onClose();
  };

  const runMutation = async (mutation: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await mutation();
      await refreshAfterChange();
    } catch {
      addToast(t('operationFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const visibleTags = tags.filter((tag) =>
    tag.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const hasExactMatch = tags.some(
    (tag) => tag.name.toLocaleLowerCase() === query.trim().toLocaleLowerCase(),
  );

  return (
    <FloatingLayer
      open={open}
      anchorRef={anchorRef}
      onClose={closePicker}
      role="dialog"
      ariaLabel={t('selectTag')}
      minWidth={260}
      className="task-tag-picker floating-panel"
    >
      <div className="task-tag-picker-search">
        <Search size={14} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.search}
          aria-label={copy.search}
        />
        {query && (
          <button type="button" aria-label={copy.clearSearch} onClick={() => setQuery('')}>
            <X size={13} />
          </button>
        )}
      </div>

      <div className="task-tag-picker-list" role="group" aria-label={t('selectTag')}>
        {visibleTags.length === 0 && !query.trim() && tags.length === 0 && (
          <p className="task-tag-picker-empty">{t('noTags')}</p>
        )}
        {visibleTags.length === 0 && (query.trim() || tags.length > 0) && (
          <p className="task-tag-picker-empty">{copy.none}</p>
        )}
        {visibleTags.map((tag) => {
          const tagId = tag.id!;
          const selectedCount = stableTaskIds.filter((id) =>
            assignedTaskIds.get(tagId)?.has(id),
          ).length;
          const checked = selectedCount === stableTaskIds.length && stableTaskIds.length > 0;
          const mixed = selectedCount > 0 && !checked;
          const checkedState = checked ? true : mixed ? 'mixed' : false;
          return (
            <div className="task-tag-picker-item" key={tagId}>
              {renamingId === tagId ? (
                <div className="task-tag-picker-rename">
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && renameDraft.trim()) {
                        event.preventDefault();
                        void runMutation(() => renameTaskTag(tagId, renameDraft));
                        setRenamingId(null);
                      }
                    }}
                    aria-label={copy.rename}
                  />
                  <button
                    type="button"
                    disabled={busy || !renameDraft.trim()}
                    aria-label={t('save')}
                    onClick={() => {
                      void runMutation(() => renameTaskTag(tagId, renameDraft));
                      setRenamingId(null);
                    }}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={t('cancel')}
                    onClick={() => setRenamingId(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : deleteCandidateId === tagId ? (
                <div className="task-tag-picker-delete-confirm">
                  <span>{copy.deletePrompt}</span>
                  <button
                    type="button"
                    className="is-danger"
                    disabled={busy}
                    onClick={() => {
                      void runMutation(() => deleteTaskTag(tagId));
                      setDeleteCandidateId(null);
                    }}
                  >
                    {copy.confirm}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setDeleteCandidateId(null)}>
                    {t('cancel')}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checkedState}
                    disabled={busy}
                    className="task-tag-picker-choice"
                    onClick={() => void runMutation(() => toggleTagForTasks(stableTaskIds, tagId))}
                  >
                    <span
                      className={`task-tag-picker-check ${checked ? 'is-checked' : ''} ${mixed ? 'is-mixed' : ''}`}
                      aria-hidden="true"
                    >
                      {checked ? <Check size={12} /> : mixed ? <Minus size={12} /> : null}
                    </span>
                    <span className="task-tag-picker-name">{tag.name}</span>
                    {mixed && <span className="task-tag-picker-partial">{copy.partial}</span>}
                  </button>
                  <div className="task-tag-picker-item-actions">
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`${copy.rename}: ${tag.name}`}
                      title={copy.rename}
                      onClick={() => {
                        setRenameDraft(tag.name);
                        setRenamingId(tagId);
                        setDeleteCandidateId(null);
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`${copy.delete}: ${tag.name}`}
                      title={copy.delete}
                      onClick={() => setDeleteCandidateId(tagId)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {query.trim() && !hasExactMatch && (
        <button
          type="button"
          className="task-tag-picker-create"
          disabled={busy}
          onClick={() => {
            const name = query.trim();
            void runMutation(() => createTagForTasks(stableTaskIds, name));
            setQuery('');
          }}
        >
          <Plus size={14} /> {t('addTag')} <span>{query.trim()}</span>
        </button>
      )}
    </FloatingLayer>
  );
}
