import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../../stores/task-store';
import { db } from '../../db/database';
import { PriorityBadge } from '../ui/PriorityBadge';
import { DueDateBadge } from '../ui/DueDateBadge';
import { todayISO } from '../../lib/format-date';
import { calendarDayDifference } from '../../lib/task-dates';
import { sortCompletedLast } from '../../lib/completion-sort';
import { readTaskExpandTrigger } from '../../lib/task-expand-trigger';
import {
  Check,
  Flag,
  ChevronRight,
  ChevronDown,
  Clock,
  Plus,
  Pencil,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import type { Task, Subtask } from '../../lib/types';
import { useT } from '../../lib/i18n';
import { useCompletionActions } from '../../lib/use-completion-actions';
import { FloatingLayer } from '../ui/FloatingLayer';
import { TaskDeleteDialog } from './TaskDeleteDialog';
import { useUIStore } from '../../stores/ui-store';
import { SortableCollection } from '../dnd/SortableCollection';
import { useSortableDragActive } from '../dnd/sortable-drag-state';
import { reorderSubtasks } from '../../db/task-ordering';
import { useFlipList } from '../../lib/use-flip-list';

interface TaskRowProps {
  task: Task;
  tagNames?: string[];
  selected?: boolean;
  selectionActive?: boolean;
  singleSelection?: boolean;
  onToggleSelection?: (id: number) => void;
}

export function TaskRow({
  task,
  tagNames = [],
  selected = false,
  selectionActive = false,
  singleSelection = false,
  onToggleSelection,
}: TaskRowProps) {
  const { t } = useT();
  const navigate = useNavigate();
  const updateTask = useTaskStore((s) => s.updateTask);
  const addToast = useUIStore((s) => s.addToast);
  const { setTaskCompletion, setSubtaskCompletion } = useCompletionActions();
  const isCompleted = !!task.completedAt;

  const [step, setStep] = useState<0 | 1 | 2>(isCompleted ? 2 : 0);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contextPoint, setContextPoint] = useState<{ x: number; y: number } | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [pendingSubs, setPendingSubs] = useState<Set<number>>(new Set());
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [subtaskTitleDraft, setSubtaskTitleDraft] = useState('');
  const canAddSubtasks = !isCompleted && step < 2;
  const hoverExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerInsideRef = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionClickAtRef = useRef(Number.NEGATIVE_INFINITY);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const cancelTitleEditRef = useRef(false);
  const subtaskTitleInputRef = useRef<HTMLInputElement>(null);
  const cancelSubtaskEditRef = useRef(false);
  const subtaskCompositionRef = useRef(false);
  const taskExpandTrigger = readTaskExpandTrigger();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sortableDragActive = useSortableDragActive();
  const sortableDragActiveRef = useRef(sortableDragActive);
  const inlineSubtaskFlipRef = useFlipList<HTMLDivElement>(
    subtasks
      .map((subtask) => `${subtask.id}:${subtask.completedAt ?? 'open'}:${subtask.sortOrder}`)
      .join('|'),
  );

  useEffect(() => {
    sortableDragActiveRef.current = sortableDragActive;
  }, [sortableDragActive]);

  useEffect(() => {
    // The row owns a short-lived completion animation state that must follow
    // completion changes arriving from the persisted task store.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep(isCompleted ? 2 : 0);
  }, [isCompleted]);
  useEffect(
    () => () => {
      if (hoverExpandTimerRef.current) clearTimeout(hoverExpandTimerRef.current);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    },
    [],
  );
  useEffect(() => {
    if (!editingTitle) return;
    titleInputRef.current?.focus({ preventScroll: true });
    titleInputRef.current?.select();
  }, [editingTitle]);
  useEffect(() => {
    if (editingSubtaskId === null) return;
    subtaskTitleInputRef.current?.focus({ preventScroll: true });
    subtaskTitleInputRef.current?.select();
  }, [editingSubtaskId]);
  useEffect(() => {
    if (step !== 1 || isCompleted) return;
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rowRef.current?.contains(target)) return;
      setStep(0);
    };
    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
  }, [isCompleted, step]);
  useEffect(() => {
    if (canAddSubtasks) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNewSubtaskTitle('');
  }, [canAddSubtasks]);

  const loadSubtasks = useCallback(async () => {
    const items = await db.subtasks.where('taskId').equals(task.id!).sortBy('sortOrder');
    setSubtasks(
      sortCompletedLast(
        items,
        (subtask) => subtask.completed,
        (subtask) => subtask.completedAt,
        {
          getSortOrder: (subtask) => subtask.sortOrder,
          getCreatedAt: (subtask) => subtask.createdAt,
          getId: (subtask) => subtask.id,
        },
      ),
    );
  }, [task.id]);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!expanded) {
      setExpanded(true);
      loadSubtasks();
    } else setExpanded(false);
  };

  const clearHoverExpand = useCallback(() => {
    if (!hoverExpandTimerRef.current) return;
    clearTimeout(hoverExpandTimerRef.current);
    hoverExpandTimerRef.current = null;
  }, []);

  const scheduleHoverExpand = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    clearHoverExpand();
    if (expanded || sortableDragActive || selectionActive) return;
    hoverExpandTimerRef.current = setTimeout(() => {
      hoverExpandTimerRef.current = null;
      if (
        !pointerInsideRef.current ||
        sortableDragActiveRef.current ||
        taskExpandTrigger !== 'hover' ||
        !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
        rowRef.current?.closest('[data-sorting="true"]')
      )
        return;
      setExpanded(true);
      void loadSubtasks();
    }, 300);
  };

  const scheduleHoverCollapse = () => {
    clearHoverExpand();
    if (!expanded) return;
    if (reducedMotion) {
      setExpanded(false);
      return;
    }
    collapseTimerRef.current = setTimeout(() => {
      if (sortableDragActiveRef.current) return;
      setExpanded(false);
      collapseTimerRef.current = null;
    }, 150);
  };

  useEffect(() => {
    if (sortableDragActive) {
      clearHoverExpand();
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
      return;
    }
    if (
      taskExpandTrigger === 'hover' &&
      expanded &&
      !pointerInsideRef.current &&
      !collapseTimerRef.current
    ) {
      collapseTimerRef.current = setTimeout(
        () => {
          setExpanded(false);
          collapseTimerRef.current = null;
        },
        reducedMotion ? 0 : 150,
      );
    }
  }, [clearHoverExpand, expanded, reducedMotion, sortableDragActive, taskExpandTrigger]);

  const doComplete = useCallback(async () => {
    if (completionSaving) return;
    setCompletionSaving(true);
    try {
      await setTaskCompletion(task.id!, true);
    } finally {
      setCompletionSaving(false);
    }
  }, [completionSaving, setTaskCompletion, task.id]);

  const handleCheck = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (completionSaving) return;
      if (onToggleSelection && (!isCompleted || selectionActive)) {
        onToggleSelection(task.id!);
        if (selected && singleSelection && !isCompleted) void doComplete();
        return;
      }
      if (isCompleted || step === 2) {
        setCompletionSaving(true);
        void setTaskCompletion(task.id!, false).finally(() => setCompletionSaving(false));
        return;
      }
      if (step === 0) setStep(1);
      else void doComplete();
    },
    [
      completionSaving,
      doComplete,
      isCompleted,
      onToggleSelection,
      selected,
      selectionActive,
      setTaskCompletion,
      singleSelection,
      step,
      task.id,
    ],
  );

  const handleSubCheck = async (s: Subtask, e: React.MouseEvent) => {
    e.stopPropagation();
    if (s.completed) {
      await setSubtaskCompletion(s, false, loadSubtasks);
      setPendingSubs((prev) => {
        const n = new Set(prev);
        n.delete(s.id!);
        return n;
      });
    } else if (pendingSubs.has(s.id!)) {
      await setSubtaskCompletion(s, true, loadSubtasks);
      setPendingSubs((prev) => {
        const n = new Set(prev);
        n.delete(s.id!);
        return n;
      });
    } else {
      setPendingSubs((prev) => new Set(prev).add(s.id!));
    }
    if (!s.completed && !pendingSubs.has(s.id!)) await loadSubtasks();
  };

  const beginTitleEdit = useCallback(() => {
    if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    setContextPoint(null);
    setTitleDraft(task.title);
    setEditingTitle(true);
  }, [task.title]);

  const commitTitleEdit = useCallback(async () => {
    if (cancelTitleEditRef.current) {
      cancelTitleEditRef.current = false;
      setEditingTitle(false);
      return;
    }
    const title = titleDraft.trim();
    if (!title || title === task.title) {
      setEditingTitle(false);
      return;
    }
    updateTask(task.id!, { title });
    try {
      await useTaskStore.getState().saveDirtyTasks();
      setEditingTitle(false);
    } catch {
      addToast(t('operationFailed'), 'error');
    }
  }, [addToast, t, task.id, task.title, titleDraft, updateTask]);

  const addInlineSubtask = async () => {
    const title = newSubtaskTitle.trim();
    if (!canAddSubtasks || !title) return;

    const maxOrder = subtasks.reduce((max, subtask) => Math.max(max, subtask.sortOrder), 0);
    await db.subtasks.add({
      taskId: task.id!,
      title,
      completed: false,
      completedAt: null,
      sortOrder: maxOrder + 1,
      dueDate: null,
      dueTime: null,
      notes: '',
      createdAt: new Date().toISOString(),
    });
    setNewSubtaskTitle('');
    await loadSubtasks();
  };

  const handleInlineSubtaskKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key !== 'Enter') return;
    const nativeComposing = (event.nativeEvent as { isComposing?: boolean }).isComposing;
    if (nativeComposing || subtaskCompositionRef.current) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    void addInlineSubtask();
  };

  const incompleteSubtasks = subtasks.filter((subtask) => !subtask.completed);
  const completedSubtasks = subtasks.filter((subtask) => subtask.completed);
  const handleSubtaskReorder = async (orderedIds: number[]) => {
    await reorderSubtasks(task.id!, orderedIds);
    await loadSubtasks();
  };

  const finishSubtaskTitleEdit = async (subtask: Subtask) => {
    if (cancelSubtaskEditRef.current) {
      cancelSubtaskEditRef.current = false;
      setEditingSubtaskId(null);
      return;
    }
    const title = subtaskTitleDraft.trim();
    setEditingSubtaskId(null);
    if (!title || title === subtask.title) return;
    await db.subtasks.update(subtask.id!, { title });
    await loadSubtasks();
  };

  const renderInlineSubtask = (s: Subtask) => (
    <div className="flex items-center gap-2 text-xs">
      <button
        onClick={(event) => handleSubCheck(s, event)}
        className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
          s.completed
            ? 'bg-blue-500 border-blue-500'
            : pendingSubs.has(s.id!)
              ? 'bg-gray-300 border-gray-300'
              : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {(s.completed || pendingSubs.has(s.id!)) && <Check size={9} className="text-white" />}
      </button>
      {editingSubtaskId === s.id ? (
        <input
          ref={subtaskTitleInputRef}
          data-no-dnd
          value={subtaskTitleDraft}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => setSubtaskTitleDraft(event.target.value)}
          onBlur={() => void finishSubtaskTitleEdit(s)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              cancelSubtaskEditRef.current = true;
              setSubtaskTitleDraft(s.title);
              event.currentTarget.blur();
            }
          }}
          className="task-subtask-inline-edit"
          aria-label={t('subtaskTitle')}
        />
      ) : (
        <span
          data-inline-edit-target
          onClick={(event) => {
            event.stopPropagation();
            if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
            if (event.detail >= 2) {
              setSubtaskTitleDraft(s.title);
              setEditingSubtaskId(s.id!);
              return;
            }
            navigationTimerRef.current = setTimeout(() => navigate(`/app/task/${task.id}`), 350);
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
            setSubtaskTitleDraft(s.title);
            setEditingSubtaskId(s.id!);
          }}
          className={`flex-1 transition-colors duration-300 ${
            s.completed
              ? 'line-through text-gray-400'
              : pendingSubs.has(s.id!)
                ? 'text-gray-400'
                : 'text-gray-600'
          }`}
        >
          {s.title}
        </span>
      )}
      {s.dueDate && (
        <span
          className={`text-xs px-1 py-0.5 rounded ${new Date(s.dueDate) < new Date(todayISO()) ? 'text-red-500 bg-red-50' : 'text-gray-400 bg-gray-100'}`}
        >
          <Clock size={10} className="inline mr-0.5" />
          {s.dueDate}
          {s.dueTime ? ` ${s.dueTime}` : ''}
        </span>
      )}
      {s.notes && (
        <span className="text-xs text-gray-400 italic truncate max-w-[120px]">{s.notes}</span>
      )}
    </div>
  );

  return (
    <>
      <div
        ref={rowRef}
        className={`task-row group cursor-pointer ${step === 2 ? 'opacity-60' : ''} ${selected ? 'is-selected' : ''}`}
        onPointerEnter={() => {
          pointerInsideRef.current = true;
          if (
            !selectionActive &&
            taskExpandTrigger === 'hover' &&
            window.matchMedia('(hover: hover) and (pointer: fine)').matches
          ) {
            scheduleHoverExpand();
          }
        }}
        onPointerLeave={() => {
          pointerInsideRef.current = false;
          clearHoverExpand();
          if (
            !selectionActive &&
            taskExpandTrigger === 'hover' &&
            window.matchMedia('(hover: hover) and (pointer: fine)').matches
          ) {
            scheduleHoverCollapse();
          }
        }}
        onClick={(event) => {
          if (editingTitle) return;
          if (
            (event.target as Element).closest(
              'button, input, textarea, select, a, [role="menu"], [role="menuitem"], [role="dialog"]',
            )
          )
            return;
          if (selectionActive && onToggleSelection) {
            if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
            selectionClickAtRef.current = performance.now();
            onToggleSelection(task.id!);
            return;
          }
          if (performance.now() - selectionClickAtRef.current < 450) return;
          if ((event.target as Element).closest('[data-inline-edit-target]')) {
            if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
            navigationTimerRef.current = setTimeout(() => navigate(`/app/task/${task.id}`), 350);
            return;
          }
          navigate(`/app/task/${task.id}`);
        }}
        onContextMenu={(event) => {
          if (selectionActive) {
            event.preventDefault();
            return;
          }
          if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
          event.preventDefault();
          if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
          setContextPoint({ x: event.clientX, y: event.clientY });
        }}
      >
        <div className="task-row-main">
          {/* Expand button */}
          <button
            type="button"
            onClick={toggleExpand}
            className="task-disclosure"
            aria-expanded={expanded}
            aria-controls={`task-subtasks-${task.id}`}
            aria-label={
              expanded
                ? t('collapseTask', { title: task.title })
                : t('expandTask', { title: task.title })
            }
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Complete circle */}
          <button
            onClick={handleCheck}
            disabled={completionSaving}
            aria-label={
              selected
                ? t('cancel')
                : isCompleted && !selectionActive
                  ? t('markIncomplete')
                  : t('complete')
            }
            aria-pressed={selected}
            className={`task-check ${
              selected
                ? 'bg-gray-300 border-gray-300'
                : step === 2
                  ? 'bg-blue-500 border-blue-500'
                  : step === 1
                    ? 'bg-gray-300 border-gray-300'
                    : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            {(selected || step >= 1) && <Check size={12} className="text-white" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  data-no-dnd
                  value={titleDraft}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onBlur={() => void commitTitleEdit()}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    } else if (event.key === 'Escape') {
                      event.preventDefault();
                      cancelTitleEditRef.current = true;
                      setTitleDraft(task.title);
                      event.currentTarget.blur();
                    }
                  }}
                  className="task-title-input"
                  aria-label={t('taskTitle')}
                />
              ) : (
                <span
                  data-inline-edit-target
                  onClick={(event) => {
                    event.stopPropagation();
                    if (selectionActive && onToggleSelection) {
                      if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
                      selectionClickAtRef.current = performance.now();
                      onToggleSelection(task.id!);
                      return;
                    }
                    if (performance.now() - selectionClickAtRef.current < 450) return;
                    if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
                    if (event.detail >= 2) {
                      beginTitleEdit();
                      return;
                    }
                    navigationTimerRef.current = setTimeout(
                      () => navigate(`/app/task/${task.id}`),
                      350,
                    );
                  }}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (selectionActive || performance.now() - selectionClickAtRef.current < 450)
                      return;
                    beginTitleEdit();
                  }}
                  className={`task-title truncate transition-colors duration-300 ${step >= 1 ? 'line-through text-gray-400' : ''}`}
                >
                  {task.title}
                </span>
              )}
              {step < 2 && <PriorityBadge priority={task.priority} />}
              {tagNames.length > 0 && (
                <span className="task-inline-tags" aria-label={t('tagName')}>
                  {tagNames.slice(0, 2).map((name) => (
                    <span className="task-inline-tag" key={name} title={name}>
                      {name}
                    </span>
                  ))}
                  {tagNames.length > 2 && (
                    <span className="task-inline-tag-more" title={tagNames.slice(2).join(', ')}>
                      +{tagNames.length - 2}
                    </span>
                  )}
                </span>
              )}
              {task.isFlagged && step < 2 && (
                <Flag size={14} className="text-orange-500 fill-orange-500 flex-shrink-0" />
              )}
            </div>
            {/* Due date + brief + countdown */}
            <div className="task-meta">
              <DueDateBadge dueDate={task.dueDate} dueTime={task.dueTime} completed={step >= 1} />
              {/* ✅ 开始日期倒计时 */}
              {task.dateStart &&
                !task.completedAt &&
                (() => {
                  const days = calendarDayDifference(todayISO(), task.dateStart.slice(0, 10));
                  if (days > 0) {
                    return (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                        {t('daysUntilStart', { n: days })}
                      </span>
                    );
                  }
                  return null;
                })()}
              {task.notes && (
                <span className="text-xs text-gray-400 truncate max-w-[200px]">
                  {task.notes.slice(0, 20)}
                  {task.notes.length > 20 ? '...' : ''}
                </span>
              )}
              {subtasks.length > 0 && !expanded && (
                <span className="text-xs text-gray-300">
                  {subtasks.filter((s) => s.completed).length}/{subtasks.length}
                </span>
              )}
            </div>
          </div>

          {step < 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateTask(task.id!, { isFlagged: !task.isFlagged });
              }}
              className={`task-flag ${task.isFlagged ? 'text-orange-500 is-active' : 'text-gray-300'}`}
            >
              <Flag size={14} fill={task.isFlagged ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        {/* ── Expanded subtasks ── */}
        <div
          id={`task-subtasks-${task.id}`}
          className={`task-subtasks ${expanded ? 'is-expanded' : ''}`}
          aria-hidden={!expanded}
          inert={!expanded}
        >
          <div>
            {subtasks.length > 0 && (
              <div ref={inlineSubtaskFlipRef} className="space-y-1.5">
                <SortableCollection
                  items={incompleteSubtasks}
                  getId={(subtask) => subtask.id!}
                  onReorder={handleSubtaskReorder}
                  renderItem={renderInlineSubtask}
                  ariaLabel={t('subtaskLabel')}
                />
                {completedSubtasks.map((subtask) => (
                  <div key={subtask.id}>{renderInlineSubtask(subtask)}</div>
                ))}
              </div>
            )}
            {canAddSubtasks && (
              <div className="task-subtask-composer">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => setNewSubtaskTitle(event.target.value)}
                  onCompositionStart={() => {
                    subtaskCompositionRef.current = true;
                  }}
                  onCompositionEnd={() => {
                    subtaskCompositionRef.current = false;
                  }}
                  onKeyDown={handleInlineSubtaskKeyDown}
                  placeholder={t('addSubtask3')}
                  aria-label={t('addSubtask3')}
                  className="task-subtask-input"
                />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void addInlineSubtask();
                  }}
                  disabled={!newSubtaskTitle.trim()}
                  className="task-subtask-add"
                  aria-label={t('addSubtask3')}
                  title={t('addSubtask3')}
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <FloatingLayer
        open={contextPoint !== null}
        point={contextPoint ?? undefined}
        onClose={() => setContextPoint(null)}
        className="task-context-menu floating-panel"
        role="menu"
        ariaLabel={task.title}
        minWidth={188}
      >
        <button type="button" role="menuitem" onClick={beginTitleEdit}>
          <Pencil size={14} /> {t('editBtn')}
        </button>
        <button type="button" role="menuitem" onClick={() => navigate(`/app/task/${task.id}`)}>
          <ExternalLink size={14} /> {t('openDetails')}
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setContextPoint(null);
            void setTaskCompletion(task.id!, !isCompleted);
          }}
        >
          <Check size={14} /> {isCompleted ? t('markIncomplete') : t('completed')}
        </button>
        <div className="task-context-priority" aria-label={t('priority')}>
          {(['high', 'medium', 'low'] as const).map((priority) => (
            <button
              key={priority}
              type="button"
              role="menuitemradio"
              aria-checked={task.priority === priority}
              onClick={() => {
                updateTask(task.id!, { priority });
                void useTaskStore.getState().saveDirtyTasks();
                setContextPoint(null);
              }}
            >
              <span className={`context-priority-dot is-${priority}`} /> {t(priority)}
            </button>
          ))}
        </div>
        <button
          type="button"
          role="menuitem"
          className="is-danger"
          onClick={() => {
            setContextPoint(null);
            setShowDeleteConfirm(true);
          }}
        >
          <Trash2 size={14} /> {t('deleteTask')}
        </button>
      </FloatingLayer>
      <TaskDeleteDialog
        task={task}
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onDeleted={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
