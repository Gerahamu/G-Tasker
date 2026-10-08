import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../db/database';
import type { Subtask } from '../../lib/types';
import { Plus, Check, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { sortCompletedLast } from '../../lib/completion-sort';
import { SortableCollection } from '../dnd/SortableCollection';
import { reorderSubtasks } from '../../db/task-ordering';
import { useCompletionActions } from '../../lib/use-completion-actions';
import { useFlipList } from '../../lib/use-flip-list';

interface SubTaskSectionProps {
  taskId: number;
  onChange?: () => void;
  canAdd?: boolean;
}

export function SubTaskSection({ taskId, onChange, canAdd = true }: SubTaskSectionProps) {
  const { t } = useT();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pendingComplete, setPendingComplete] = useState<Set<number>>(new Set());
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const cancelInlineEditRef = useRef(false);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const { setSubtaskCompletion } = useCompletionActions();
  // Track dirty subtask edits so we don't lose them during DB reload
  const dirtyTitlesRef = useRef<Map<number, string>>(new Map());
  const dirtyNotesRef = useRef<Map<number, string>>(new Map());
  const composingRef = useRef(false);
  const updateTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const loadSubtasks = useCallback(async () => {
    const items = await db.subtasks.where('taskId').equals(taskId).sortBy('sortOrder');
    // Apply any unsaved edits on top of DB data
    const merged = items.map((s) => {
      const dirtyTitle = dirtyTitlesRef.current.get(s.id!);
      const dirtyNotes = dirtyNotesRef.current.get(s.id!);
      if (dirtyTitle !== undefined || dirtyNotes !== undefined) {
        return {
          ...s,
          ...(dirtyTitle !== undefined ? { title: dirtyTitle } : {}),
          ...(dirtyNotes !== undefined ? { notes: dirtyNotes } : {}),
        };
      }
      return s;
    });
    setSubtasks(
      sortCompletedLast(
        merged,
        (subtask) => subtask.completed,
        (subtask) => subtask.completedAt,
        {
          getSortOrder: (subtask) => subtask.sortOrder,
          getCreatedAt: (subtask) => subtask.createdAt,
          getId: (subtask) => subtask.id,
        },
      ),
    );
  }, [taskId]);

  useEffect(() => {
    loadSubtasks();
  }, [loadSubtasks]);

  useEffect(
    () => () => {
      for (const timer of updateTimersRef.current.values()) clearTimeout(timer);
      updateTimersRef.current.clear();
    },
    [],
  );
  useEffect(() => {
    if (inlineEditId === null) return;
    inlineInputRef.current?.focus({ preventScroll: true });
    inlineInputRef.current?.select();
  }, [inlineEditId]);
  useEffect(() => {
    if (!showComposer) return;
    addInputRef.current?.focus({ preventScroll: true });
  }, [showComposer]);
  useEffect(() => {
    if (canAdd) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowComposer(false);
    setNewTitle('');
  }, [canAdd]);

  const addSubtask = async () => {
    if (!canAdd || !newTitle.trim()) return;
    const maxOrder = subtasks.reduce((max, s) => Math.max(max, s.sortOrder), 0);
    await db.subtasks.add({
      taskId,
      title: newTitle.trim(),
      completed: false,
      completedAt: null,
      sortOrder: maxOrder + 1,
      dueDate: null,
      dueTime: null,
      notes: '',
      createdAt: new Date().toISOString(),
    });
    setNewTitle('');
    loadSubtasks();
    onChange?.();
  };

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const nativeComposing = (e.nativeEvent as { isComposing?: boolean }).isComposing;
      if (nativeComposing === true || composingRef.current) {
        e.preventDefault();
        return;
      }
      addSubtask();
    }
  };

  const handleCheck = async (s: Subtask) => {
    if (s.completed) {
      await setSubtaskCompletion(s, false, loadSubtasks);
      setPendingComplete((prev) => {
        const n = new Set(prev);
        n.delete(s.id!);
        return n;
      });
    } else if (pendingComplete.has(s.id!)) {
      await setSubtaskCompletion(s, true, loadSubtasks);
      setPendingComplete((prev) => {
        const n = new Set(prev);
        n.delete(s.id!);
        return n;
      });
    } else {
      setPendingComplete((prev) => new Set(prev).add(s.id!));
    }
    if (!s.completed && !pendingComplete.has(s.id!)) await loadSubtasks();
    onChange?.();
  };

  const finishInlineEdit = async (subtask: Subtask) => {
    if (cancelInlineEditRef.current) {
      cancelInlineEditRef.current = false;
      setInlineEditId(null);
      return;
    }
    const title = inlineTitle.trim();
    setInlineEditId(null);
    if (!title || title === subtask.title) return;
    await db.subtasks.update(subtask.id!, { title });
    await loadSubtasks();
    onChange?.();
  };

  const incompleteSubtasks = subtasks.filter((subtask) => !subtask.completed);
  const completedSubtasks = subtasks.filter((subtask) => subtask.completed);
  const skipFlipRef = useRef(false);
  const flipRef = useFlipList<HTMLDivElement>(
    subtasks.map((subtask) => `${subtask.id}:${subtask.completed}:${subtask.sortOrder}`).join('|'),
    skipFlipRef,
  );

  const handleReorder = async (orderedIds: number[]) => {
    skipFlipRef.current = true;
    try {
      await reorderSubtasks(taskId, orderedIds);
      await loadSubtasks();
      onChange?.();
    } finally {
      window.setTimeout(() => {
        skipFlipRef.current = false;
      }, 250);
    }
  };

  /**
   * Update a subtask field. During IME composition, we update local state
   * optimistically and defer the DB write until composition ends to avoid
   * the write→reload→overwrite cycle that breaks CJK input.
   */
  const updateSubtaskField = useCallback(
    async (id: number, field: 'title' | 'notes', value: string) => {
      // Always update local state immediately (keeps input responsive)
      setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));

      // Track dirty value in ref
      if (field === 'title') dirtyTitlesRef.current.set(id, value);
      else dirtyNotesRef.current.set(id, value);

      // If not currently composing, persist to DB
      if (!composingRef.current) {
        await db.subtasks.update(id, { [field]: value });
        if (field === 'title') dirtyTitlesRef.current.delete(id);
        else dirtyNotesRef.current.delete(id);
        onChange?.();
      }
    },
    [onChange],
  );

  /**
   * Called when composition ends — persist the final value to DB
   */
  const handleCompositionEndPersist = useCallback(
    async (id: number, field: 'title' | 'notes', value: string) => {
      composingRef.current = false;
      await db.subtasks.update(id, { [field]: value });
      if (field === 'title') dirtyTitlesRef.current.delete(id);
      else dirtyNotesRef.current.delete(id);
      onChange?.();
    },
    [onChange],
  );

  /** Debounced direct field update — for non-title/notes fields or rapid updates */
  const updateFieldDebounced = useCallback(
    (id: number, patch: Partial<Subtask>) => {
      const key = `${id}-${Object.keys(patch).join('-')}`;
      const existing = updateTimersRef.current.get(key);
      if (existing) clearTimeout(existing);
      updateTimersRef.current.set(
        key,
        setTimeout(async () => {
          await db.subtasks.update(id, patch);
          await loadSubtasks();
          onChange?.();
          updateTimersRef.current.delete(key);
        }, 150),
      );
    },
    [loadSubtasks, onChange],
  );

  const deleteSubtask = async (id: number) => {
    await db.subtasks.delete(id);
    dirtyTitlesRef.current.delete(id);
    dirtyNotesRef.current.delete(id);
    loadSubtasks();
    onChange?.();
  };

  const renderSubtask = (s: Subtask) => (
    <div className="detail-subtask-item">
      <div className="detail-subtask-main">
        <button
          onClick={() => handleCheck(s)}
          className={`detail-subtask-check ${
            s.completed ? 'is-completed' : pendingComplete.has(s.id!) ? 'is-pending' : ''
          }`}
          aria-label={s.title}
        >
          {(s.completed || pendingComplete.has(s.id!)) && (
            <Check size={10} className="text-white" />
          )}
        </button>
        {inlineEditId === s.id ? (
          <input
            ref={inlineInputRef}
            data-no-dnd
            value={inlineTitle}
            onChange={(event) => setInlineTitle(event.target.value)}
            onBlur={() => void finishInlineEdit(s)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                cancelInlineEditRef.current = true;
                setInlineTitle(s.title);
                event.currentTarget.blur();
              }
            }}
            className="detail-subtask-title-input"
            aria-label={t('subtaskTitle')}
          />
        ) : (
          <span
            onDoubleClick={(event) => {
              event.stopPropagation();
              setInlineTitle(s.title);
              setInlineEditId(s.id!);
            }}
            className={`detail-subtask-title ${
              s.completed ? 'is-completed' : pendingComplete.has(s.id!) ? 'is-pending' : ''
            }`}
          >
            {s.title}
          </span>
        )}
        <button
          onClick={() => setExpandedId(expandedId === s.id ? null : s.id!)}
          className="detail-subtask-icon-button"
          aria-label={expandedId === s.id ? t('collapseAdv') : t('advOptions')}
        >
          {expandedId === s.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <button
          onClick={() => deleteSubtask(s.id!)}
          className="detail-subtask-icon-button is-danger"
          aria-label={t('delete')}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {expandedId === s.id && (
        <div className="detail-subtask-expanded animate-slide-down">
          <div className="detail-subtask-expanded-grid">
            <div className="detail-subtask-expanded-title">
              <label>{t('subtaskTitle')}</label>
              <input
                type="text"
                value={s.title}
                onChange={(e) => updateSubtaskField(s.id!, 'title', e.target.value)}
                onCompositionStart={() => {
                  composingRef.current = true;
                }}
                onCompositionEnd={(e) =>
                  handleCompositionEndPersist(s.id!, 'title', (e.target as HTMLInputElement).value)
                }
                className="detail-subtask-field"
              />
            </div>
            <div>
              <label>{t('subtaskDate')}</label>
              <input
                type="date"
                value={s.dueDate || ''}
                onChange={(e) => updateFieldDebounced(s.id!, { dueDate: e.target.value || null })}
                className="detail-subtask-field"
              />
            </div>
            <div>
              <label>{t('subtaskTime')}</label>
              <input
                type="time"
                value={s.dueTime || ''}
                onChange={(e) => updateFieldDebounced(s.id!, { dueTime: e.target.value || null })}
                className="detail-subtask-field"
              />
            </div>
          </div>
          <div className="detail-subtask-notes">
            <label>{t('notesLabel')}</label>
            <input
              type="text"
              value={s.notes || ''}
              onChange={(e) => updateSubtaskField(s.id!, 'notes', e.target.value)}
              onCompositionStart={() => {
                composingRef.current = true;
              }}
              onCompositionEnd={(e) =>
                handleCompositionEndPersist(s.id!, 'notes', (e.target as HTMLInputElement).value)
              }
              placeholder={t('supplementalNotes')}
              className="detail-subtask-field"
            />
          </div>
        </div>
      )}
    </div>
  );

  const completed = subtasks.filter((s) => s.completed).length;

  return (
    <div ref={flipRef} className="detail-subtask-section">
      <div className="detail-subtask-heading">
        <h3>
          <span>{t('subtaskLabel')}</span>
          {subtasks.length > 0 && (
            <span className="detail-subtask-count">
              {completed}/{subtasks.length}
            </span>
          )}
        </h3>
        {canAdd && (
          <button
            type="button"
            className="detail-subtask-add-trigger"
            onClick={() => setShowComposer(true)}
          >
            <Plus size={14} />
            {t('addSubtask3')}
          </button>
        )}
      </div>

      <div className="detail-subtask-list">
        <SortableCollection
          items={incompleteSubtasks}
          getId={(subtask) => subtask.id!}
          onReorder={handleReorder}
          renderItem={renderSubtask}
          ariaLabel={t('subtaskLabel')}
        />
        {completedSubtasks.map((subtask) => (
          <div key={subtask.id} data-flip-key={subtask.id}>
            {renderSubtask(subtask)}
          </div>
        ))}
      </div>

      {canAdd && showComposer && (
        <div className="detail-subtask-composer animate-slide-down">
          <input
            ref={addInputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
            }}
            onKeyDown={handleAddKeyDown}
            placeholder={t('addSubtask3')}
          />
          <button onClick={addSubtask} disabled={!newTitle.trim()} aria-label={t('addSubtask3')}>
            <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
