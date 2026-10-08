import { useT } from '../../lib/i18n';
import { sortCompletedLast } from '../../lib/completion-sort';
import { TaskRow } from './TaskRow';
import type { Task } from '../../lib/types';
import { SortableCollection } from '../dnd/SortableCollection';
import { useTaskStore } from '../../stores/task-store';
import { useListStore } from '../../stores/list-store';
import { useUIStore } from '../../stores/ui-store';
import { useCompletionActions } from '../../lib/use-completion-actions';
import { loadTaskTagSnapshot } from '../../db/task-tags';
import { normalizeTaskDates } from '../../lib/task-dates';
import { getListDisplayName } from '../../lib/i18n';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  CalendarDays,
  Check,
  ChevronDown,
  FolderInput,
  MoreHorizontal,
  Tag as TagIcon,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFlipList } from '../../lib/use-flip-list';
import { TaskTagPicker } from './TaskTagPicker';

const BULK_COPY = {
  zh: {
    selected: '已选 {n} 项',
    complete: '完成',
    changeTime: '改时间',
    move: '移动',
    more: '更多',
    tags: '标签',
    exit: '退出多选',
    apply: '应用',
    clearDate: '清除日期',
    deleteConfirm: '确定删除选中的 {n} 个任务？此操作不可撤销。',
    noLists: '暂无可用列表',
  },
  en: {
    selected: '{n} selected',
    complete: 'Complete',
    changeTime: 'Change date',
    move: 'Move',
    more: 'More',
    tags: 'Tags',
    exit: 'Exit selection',
    apply: 'Apply',
    clearDate: 'Clear date',
    deleteConfirm: 'Delete {n} selected tasks? This cannot be undone.',
    noLists: 'No lists available',
  },
  ja: {
    selected: '{n} 件選択',
    complete: '完了',
    changeTime: '日時変更',
    move: '移動',
    more: 'その他',
    tags: 'タグ',
    exit: '選択を終了',
    apply: '適用',
    clearDate: '日付を削除',
    deleteConfirm: '選択した {n} 件のタスクを削除しますか？元に戻せません。',
    noLists: 'リストがありません',
  },
} as const;

interface TaskListProps {
  tasks: Task[];
  emptyMessage?: string;
}

export function TaskList({ tasks, emptyMessage }: TaskListProps) {
  const { t, lang } = useT();
  const copy = BULK_COPY[lang];
  const reorderTasks = useTaskStore((state) => state.reorderTasks);
  const updateTask = useTaskStore((state) => state.updateTask);
  const saveDirtyTasks = useTaskStore((state) => state.saveDirtyTasks);
  const deleteTasks = useTaskStore((state) => state.deleteTasks);
  const lists = useListStore((state) => state.lists);
  const loadLists = useListStore((state) => state.loadLists);
  const addToast = useUIStore((state) => state.addToast);
  const { setTaskCompletion } = useCompletionActions();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [selectionReachedMultiple, setSelectionReachedMultiple] = useState(false);
  const [panel, setPanel] = useState<'date' | 'move' | 'more' | null>(null);
  const [dateDraft, setDateDraft] = useState('');
  const [timeDraft, setTimeDraft] = useState('');
  const [dateTouched, setDateTouched] = useState(false);
  const [timeTouched, setTimeTouched] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const tagLoadRevisionRef = useRef(0);
  const taskIds = useMemo(
    () => tasks.flatMap((task) => (task.id === undefined ? [] : [task.id])),
    [tasks],
  );
  const selectedTaskIds = useMemo(
    () =>
      tasks.flatMap((task) =>
        task.id === undefined || !selectedIds.has(task.id) ? [] : [task.id],
      ),
    [selectedIds, tasks],
  );
  const [tagNamesByTaskId, setTagNamesByTaskId] = useState<Record<number, string[]>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const selectedTasks = tasks.filter((task) => task.id !== undefined && selectedIds.has(task.id));
  const selectionActive = selectedTasks.length > 0;
  const selectedCount = selectedTasks.length;
  const multipleSelected = selectedCount >= 2;
  useEffect(() => {
    const visibleIds = new Set(tasks.map((task) => task.id));
    // A smart-list filter may remove tasks while they are selected.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds((current) => {
      if ([...current].every((id) => visibleIds.has(id))) return current;
      return new Set([...current].filter((id) => visibleIds.has(id)));
    });
  }, [tasks]);
  const clearSelection = () => {
    setSelectionReachedMultiple(false);
    setSelectedIds(new Set());
    setPanel(null);
    setTagPickerOpen(false);
  };
  const toggleSelection = useCallback(
    (id: number) => {
      setPanel(null);
      setTagPickerOpen(false);
      const nextSelectedCount = selectedCount + (selectedIds.has(id) ? -1 : 1);
      setSelectionReachedMultiple((wasMultiple) =>
        selectedCount === 0 || nextSelectedCount === 0
          ? false
          : wasMultiple || nextSelectedCount >= 2,
      );
      setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [selectedCount, selectedIds],
  );
  const refreshTaskTags = useCallback(async () => {
    const revision = ++tagLoadRevisionRef.current;
    const snapshot = await loadTaskTagSnapshot(taskIds);
    if (revision !== tagLoadRevisionRef.current) return;
    const tagsById = new Map(
      snapshot.tags.flatMap((tag) => (tag.id === undefined ? [] : [[tag.id, tag.name] as const])),
    );
    const names: Record<number, string[]> = {};
    for (const relation of snapshot.relations) {
      const name = tagsById.get(relation.tagId);
      if (name === undefined) continue;
      (names[relation.taskId] ??= []).push(name);
    }
    for (const taskNames of Object.values(names))
      taskNames.sort((left, right) => left.localeCompare(right));
    setTagNamesByTaskId(names);
  }, [taskIds]);
  useEffect(() => {
    void refreshTaskTags().catch(() => addToast(t('operationFailed'), 'error'));
  }, [addToast, refreshTaskTags, t]);
  useEffect(() => {
    if (!selectionActive) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || confirmDelete || busy) return;
      if (panel) setPanel(null);
      else clearSelection();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [busy, confirmDelete, panel, selectionActive]);

  const runPatches = async (patches: Array<{ id: number; patch: Partial<Task> }>) => {
    if (busy) return;
    setBusy(true);
    try {
      for (const { id, patch } of patches) updateTask(id, patch);
      await saveDirtyTasks();
      clearSelection();
    } catch {
      addToast(t('operationFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const moveSelectedTo = (listId: number) => {
    const moving = selectedTasks.filter((task) => task.listId !== listId);
    if (moving.length === 0) {
      clearSelection();
      return;
    }
    const lastOrder = useTaskStore
      .getState()
      .tasks.reduce((max, task) => Math.max(max, task.listId === listId ? task.sortOrder : 0), 0);
    void runPatches(
      moving.map((task, index) => ({
        id: task.id!,
        patch: { listId, sortOrder: lastOrder + index + 1 },
      })),
    );
  };

  const applyDate = (clearDate = false) => {
    try {
      const patches = selectedTasks.map((task) => {
        const nextDate = clearDate ? null : dateTouched ? dateDraft || null : task.dueDate;
        const nextTime = nextDate ? (timeTouched ? timeDraft || null : task.dueTime) : null;
        const dateEnd =
          task.dateMode === 'advanced' && nextDate
            ? `${nextDate}${nextTime ? `T${nextTime}` : ''}`
            : null;
        return {
          id: task.id!,
          patch: normalizeTaskDates({
            dateMode: task.dateMode,
            dueDate: nextDate,
            dueTime: nextTime,
            dateStart: task.dateStart,
            dateEnd,
          }),
        };
      });
      void runPatches(patches);
    } catch {
      addToast(t('invalidDateRange'), 'error');
    }
  };

  const applyCompletion = async () => {
    if (busy) return;
    setBusy(true);
    const ids = selectedTasks.filter((task) => !task.completedAt).map((task) => task.id!);
    let failed = false;
    try {
      for (const id of ids) {
        await setTaskCompletion(id, true);
        if (!useTaskStore.getState().getTask(id)?.completedAt) failed = true;
      }
      if (failed) addToast(t('operationFailed'), 'error');
      else clearSelection();
    } finally {
      setBusy(false);
    }
  };

  const msg = emptyMessage || t('noTasks2');
  const orderedTasks = sortCompletedLast(
    tasks,
    (task) => Boolean(task.completedAt),
    (task) => task.completedAt,
    {
      getSortOrder: (task) => task.sortOrder,
      getCreatedAt: (task) => task.createdAt,
      getId: (task) => task.id,
    },
  );
  const incomplete = orderedTasks.filter((task) => !task.completedAt);
  const completed = orderedTasks.filter((task) => task.completedAt);
  const skipFlipRef = useRef(false);
  const flipRef = useFlipList<HTMLDivElement>(
    orderedTasks
      .map((task) => `${task.id}:${task.completedAt ?? 'open'}:${task.sortOrder}`)
      .join('|'),
    skipFlipRef,
  );
  const handleReorder = useCallback(
    async (visibleIds: number[], activeId: number, overId: number) => {
      const active = incomplete.find((task) => task.id === activeId);
      const over = incomplete.find((task) => task.id === overId);
      if (!active || !over || active.listId !== over.listId) return;
      const sameListIds = visibleIds.filter(
        (id) => incomplete.find((task) => task.id === id)?.listId === active.listId,
      );
      skipFlipRef.current = true;
      try {
        await reorderTasks(sameListIds);
      } finally {
        window.setTimeout(() => {
          skipFlipRef.current = false;
        }, 250);
      }
    },
    [incomplete, reorderTasks],
  );

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-mark" aria-hidden="true" />
        <p>{msg}</p>
      </div>
    );
  }

  return (
    <div ref={flipRef} className="task-list-surface">
      {multipleSelected && (
        <div
          className="task-bulk-actions"
          role="toolbar"
          aria-label={copy.selected.replace('{n}', String(selectedCount))}
        >
          <span className="task-bulk-count">
            {copy.selected.replace('{n}', String(selectedCount))}
          </span>
          <button
            type="button"
            disabled={busy || selectedTasks.every((task) => !!task.completedAt)}
            onClick={() => void applyCompletion()}
          >
            <Check size={14} /> {copy.complete}
          </button>
          <button
            type="button"
            disabled={busy}
            aria-expanded={panel === 'date'}
            onClick={() => {
              const firstDate = selectedTasks[0]?.dueDate ?? '';
              const firstTime = selectedTasks[0]?.dueTime ?? '';
              setDateDraft(
                selectedTasks.every((task) => (task.dueDate ?? '') === firstDate) ? firstDate : '',
              );
              setTimeDraft(
                selectedTasks.every((task) => (task.dueTime ?? '') === firstTime) ? firstTime : '',
              );
              setDateTouched(false);
              setTimeTouched(false);
              setPanel(panel === 'date' ? null : 'date');
            }}
          >
            <CalendarDays size={14} /> {copy.changeTime}
          </button>
          <button
            type="button"
            disabled={busy}
            aria-expanded={panel === 'move'}
            onClick={() => {
              if (panel === 'move') setPanel(null);
              else {
                void loadLists().catch(() => addToast(t('operationFailed'), 'error'));
                setPanel('move');
              }
            }}
          >
            <FolderInput size={14} /> {copy.move}
          </button>
          <button
            type="button"
            ref={moreButtonRef}
            disabled={busy}
            aria-expanded={panel === 'more'}
            onClick={() => setPanel(panel === 'more' ? null : 'more')}
          >
            <MoreHorizontal size={14} /> {copy.more} <ChevronDown size={12} />
          </button>
          <button
            type="button"
            className="task-bulk-exit"
            disabled={busy}
            onClick={clearSelection}
            aria-label={copy.exit}
            title={copy.exit}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {multipleSelected && panel === 'date' && (
        <div className="task-bulk-panel" aria-label={copy.changeTime}>
          <input
            type="date"
            value={dateDraft}
            onChange={(event) => {
              setDateDraft(event.target.value);
              setDateTouched(true);
            }}
            aria-label={t('dueDate')}
          />
          <input
            type="time"
            value={timeDraft}
            onChange={(event) => {
              setTimeDraft(event.target.value);
              setTimeTouched(true);
            }}
            aria-label={t('dueTime')}
          />
          <button
            type="button"
            disabled={busy || (!dateTouched && !timeTouched)}
            onClick={() => applyDate()}
          >
            {copy.apply}
          </button>
          <button type="button" disabled={busy} onClick={() => applyDate(true)}>
            {copy.clearDate}
          </button>
        </div>
      )}
      {multipleSelected && panel === 'move' && (
        <div className="task-bulk-panel task-bulk-choices" aria-label={copy.move}>
          {lists.filter((list) => !list.isSmartList).length === 0 && <span>{copy.noLists}</span>}
          {lists
            .filter((list) => !list.isSmartList)
            .map((list) => (
              <button
                key={list.id}
                type="button"
                disabled={busy}
                onClick={() => moveSelectedTo(list.id!)}
              >
                {getListDisplayName(list.name, t)}
              </button>
            ))}
        </div>
      )}
      {multipleSelected && panel === 'more' && (
        <div className="task-bulk-panel task-bulk-choices" aria-label={copy.more}>
          <button
            type="button"
            onClick={() => {
              setPanel(null);
              setTagPickerOpen(true);
            }}
          >
            <TagIcon size={14} /> {copy.tags}
          </button>
          <button
            type="button"
            className="is-danger"
            onClick={() => {
              setPanel(null);
              setConfirmDelete(true);
            }}
          >
            <Trash2 size={14} /> {t('delete')}
          </button>
        </div>
      )}
      <SortableCollection
        items={incomplete}
        getId={(task) => task.id!}
        onReorder={handleReorder}
        disabled={selectionActive}
        renderItem={(task) => (
          <TaskRow
            task={task}
            selected={selectedIds.has(task.id!)}
            tagNames={tagNamesByTaskId[task.id!] ?? []}
            selectionActive={selectionActive}
            singleSelection={selectedCount === 1 && !selectionReachedMultiple}
            onToggleSelection={toggleSelection}
          />
        )}
        itemClassName="task-sortable-row"
        ariaLabel={t('taskSection')}
      />
      {completed.length > 0 && (
        <>
          <div className="task-list-section-label">
            {t('completed')} ({completed.length})
          </div>
          {completed.map((task) => (
            <div key={task.id} data-flip-key={task.id} className="task-sortable-row">
              <TaskRow
                task={task}
                selected={selectedIds.has(task.id!)}
                tagNames={tagNamesByTaskId[task.id!] ?? []}
                selectionActive={selectionActive}
                singleSelection={selectedCount === 1 && !selectionReachedMultiple}
                onToggleSelection={toggleSelection}
              />
            </div>
          ))}
        </>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={t('deleteTask')}
          message={copy.deleteConfirm.replace('{n}', String(selectedCount))}
          confirmLabel={t('deleteBtn')}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            if (busy) return;
            setBusy(true);
            try {
              await deleteTasks(selectedTasks.map((task) => task.id!));
              setConfirmDelete(false);
              clearSelection();
              addToast(t('deletedToast'), 'success');
            } catch {
              addToast(t('operationFailed'), 'error');
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      <TaskTagPicker
        open={tagPickerOpen && multipleSelected}
        taskIds={selectedTaskIds}
        anchorRef={moreButtonRef}
        onClose={() => setTagPickerOpen(false)}
        onChanged={refreshTaskTags}
      />
    </div>
  );
}
