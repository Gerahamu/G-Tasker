import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTaskStore } from '../../stores/task-store';
import { useListStore } from '../../stores/list-store';
import { useUIStore } from '../../stores/ui-store';
import { useT } from '../../lib/i18n';
import { SubTaskSection } from '../subtask/SubtaskSection';
import { PriorityBadge } from '../ui/PriorityBadge';
import { DateTimePicker } from '../ui/DateTimePicker';
import type { Priority } from '../../lib/types';
import { reportSaveFailure } from '../../autosave/autosave-engine';
import { normalizeTaskDates, TaskDateValidationError } from '../../lib/task-dates';
import { TaskDeleteDialog } from '../task/TaskDeleteDialog';
import { TaskTagPicker } from '../task/TaskTagPicker';
import { TaskPlanningDetails } from '../task/TaskPlanningDetails';
import { FloatingLayer } from '../ui/FloatingLayer';
import { loadTaskTagSnapshot } from '../../db/task-tags';
import { useCompletionActions } from '../../lib/use-completion-actions';
import { formatDueDateTime } from '../../lib/format-date';
import {
  ArrowLeft,
  Flag,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Check,
  CheckCircle2,
  Circle,
  FileText,
  ListChecks,
  MoreHorizontal,
  SlidersHorizontal,
  Tag,
  Trash2,
} from 'lucide-react';

const DETAIL_COPY = {
  zh: {
    properties: '任务属性',
    autosaved: '已自动保存',
    saving: '正在保存…',
    pending: '等待自动保存…',
    saveError: '保存失败',
    moreActions: '更多操作',
    completeTask: '完成任务',
    reopenTask: '重新打开',
    completed: '已完成',
    incomplete: '未完成',
    dateAndTime: '日期与时间',
    noDate: '未设置日期',
  },
  en: {
    properties: 'Task properties',
    autosaved: 'Auto-saved',
    saving: 'Saving…',
    pending: 'Waiting to save…',
    saveError: 'Save failed',
    moreActions: 'More actions',
    completeTask: 'Complete task',
    reopenTask: 'Reopen task',
    completed: 'Completed',
    incomplete: 'Incomplete',
    dateAndTime: 'Date and time',
    noDate: 'No date',
  },
  ja: {
    properties: 'タスク属性',
    autosaved: '自動保存済み',
    saving: '保存中…',
    pending: '自動保存待ち…',
    saveError: '保存に失敗しました',
    moreActions: 'その他の操作',
    completeTask: 'タスクを完了',
    reopenTask: '再開する',
    completed: '完了',
    incomplete: '未完了',
    dateAndTime: '日付と時刻',
    noDate: '日付なし',
  },
} as const;

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { t, lang } = useT();
  const words = DETAIL_COPY[lang];
  const [showAdvancedDate, setShowAdvancedDate] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'saving' | 'error'>('saved');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [taskTagNames, setTaskTagNames] = useState<string[]>([]);
  const [autosaveTick, setAutosaveTick] = useState(0);
  const moreActionsRef = useRef<HTMLButtonElement>(null);
  const tagAnchorRef = useRef<HTMLButtonElement>(null);
  const tagLoadRevisionRef = useRef(0);
  const saveRevisionRef = useRef(0);
  const hasPendingSave = useTaskStore((s) => s.dirtyIds.has(Number(taskId)));

  const allTasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const loadAllTasks = useTaskStore((s) => s.loadAllTasks);
  const addToast = useUIStore((s) => s.addToast);
  const { setTaskCompletion } = useCompletionActions();

  const loadLists = useListStore((s) => s.loadLists);

  const task = useMemo(
    () =>
      taskId && taskId !== 'new' ? (allTasks.find((t) => t.id === Number(taskId)) ?? null) : null,
    [allTasks, taskId],
  );
  const currentTaskIds = useMemo(() => (task?.id === undefined ? [] : [task.id]), [task?.id]);
  const refreshTaskTags = useCallback(async () => {
    if (task?.id === undefined) return;
    const revision = ++tagLoadRevisionRef.current;
    const snapshot = await loadTaskTagSnapshot([task.id]);
    if (revision !== tagLoadRevisionRef.current) return;
    const tagsById = new Map(
      snapshot.tags.flatMap((tag) => (tag.id === undefined ? [] : [[tag.id, tag.name] as const])),
    );
    setTaskTagNames(
      snapshot.relations
        .filter((relation) => relation.taskId === task.id)
        .flatMap((relation) => {
          const name = tagsById.get(relation.tagId);
          return name === undefined ? [] : [name];
        })
        .sort((left, right) => left.localeCompare(right)),
    );
  }, [task?.id]);
  // ── Form state ──
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [isFlagged, setIsFlagged] = useState(false);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [subtaskChanged, setSubtaskChanged] = useState(false);
  const isComposingRef = useRef(false);

  useEffect(() => {
    loadAllTasks();
    loadLists();
  }, []);

  useEffect(() => {
    void refreshTaskTags().catch(() => addToast(t('operationFailed'), 'error'));
  }, [addToast, refreshTaskTags, t]);

  // Sync task data → form state, but NOT during IME composition
  useEffect(() => {
    if (task && !isComposingRef.current) {
      setTitle(task.title);
      setNotes(task.notes);
      setPriority(task.priority);
      setIsFlagged(task.isFlagged);
      setDueDate(task.dueDate || '');
      setDateStart(task.dateStart || '');
      setDateEnd(
        task.dateEnd ||
          (task.dateMode === 'advanced' && task.dueDate
            ? `${task.dueDate}${task.dueTime ? `T${task.dueTime}` : ''}`
            : ''),
      );
      setShowAdvancedDate(task.dateMode === 'advanced');
    }
  }, [task]);

  // Keep the existing normalization boundary, but persist it automatically.
  const persistedDateEnd =
    task?.dateEnd ||
    (task?.dateMode === 'advanced' && task.dueDate
      ? `${task.dueDate}${task.dueTime ? `T${task.dueTime}` : ''}`
      : '');

  const formModified = useMemo(() => {
    if (!task) return true; // new task always "modified"
    return (
      title !== task.title ||
      notes !== task.notes ||
      priority !== task.priority ||
      isFlagged !== task.isFlagged ||
      dueDate !== (task.dueDate || '') ||
      dateStart !== (task.dateStart || '') ||
      dateEnd !== persistedDateEnd ||
      showAdvancedDate !== (task.dateMode === 'advanced')
    );
  }, [
    task,
    title,
    notes,
    priority,
    isFlagged,
    dueDate,
    dateStart,
    dateEnd,
    persistedDateEnd,
    showAdvancedDate,
  ]);
  const isModified = formModified || subtaskChanged;

  const persistChanges = useCallback(async (): Promise<boolean> => {
    if (!task) return false;
    if (!formModified && !subtaskChanged && !hasPendingSave) {
      setSaveState('saved');
      return true;
    }
    const revision = ++saveRevisionRef.current;
    setSaveState('saving');
    try {
      const dates = normalizeTaskDates({
        dateMode: showAdvancedDate ? 'advanced' : 'simple',
        dueDate,
        dueTime: task.dueTime,
        dateStart,
        dateEnd,
      });
      if (formModified) {
        updateTask(task.id!, {
          title: title.trim() || task.title,
          notes,
          priority,
          isFlagged,
          ...dates,
        });
      }
      if (formModified || hasPendingSave) await useTaskStore.getState().saveDirtyTasks();
      if (revision === saveRevisionRef.current) {
        setSubtaskChanged(false);
        setSaveState('saved');
      }
      return true;
    } catch (error) {
      if (error instanceof TaskDateValidationError) addToast(t('invalidDateRange'), 'error');
      else reportSaveFailure();
      if (revision === saveRevisionRef.current) setSaveState('error');
      return false;
    }
  }, [
    addToast,
    dateEnd,
    dateStart,
    dueDate,
    formModified,
    hasPendingSave,
    isFlagged,
    notes,
    priority,
    showAdvancedDate,
    subtaskChanged,
    t,
    task,
    title,
    updateTask,
  ]);

  useEffect(() => {
    if (!task || (!isModified && !hasPendingSave)) return;
    const timer = window.setTimeout(() => {
      if (isComposingRef.current) return;
      void persistChanges();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [autosaveTick, hasPendingSave, isModified, persistChanges, task]);

  const finishComposition = () => {
    isComposingRef.current = false;
    setAutosaveTick((value) => value + 1);
  };

  const handleBack = async () => {
    if (await persistChanges()) navigate(-1);
  };

  const handleTaskCompletion = async () => {
    if (!task) return;
    if (!(await persistChanges())) return;
    await setTaskCompletion(task.id!, !task.completedAt);
  };

  if (!task) {
    return <div className="text-center py-20 text-gray-400">{t('taskNotFound')}</div>;
  }

  const dueSummary = formatDueDateTime(dueDate || null, task.dueTime, lang, t);
  const saveLabel =
    saveState === 'saving'
      ? words.saving
      : saveState === 'error'
        ? words.saveError
        : isModified || hasPendingSave
          ? words.pending
          : words.autosaved;

  return (
    <div className="task-detail-page">
      <header className="task-detail-toolbar">
        <button type="button" onClick={() => void handleBack()} className="task-detail-back">
          <ArrowLeft size={17} />
          <span>{t('back')}</span>
        </button>
        <div className="task-detail-toolbar-actions">
          <span className={`task-detail-save-state is-${saveState}`} aria-live="polite">
            {saveLabel}
          </span>
          <button
            ref={moreActionsRef}
            type="button"
            className="task-detail-icon-button"
            onClick={() => setShowMoreActions((open) => !open)}
            aria-label={words.moreActions}
            aria-haspopup="menu"
            aria-expanded={showMoreActions}
          >
            <MoreHorizontal size={18} />
          </button>
          <FloatingLayer
            open={showMoreActions}
            anchorRef={moreActionsRef}
            onClose={() => setShowMoreActions(false)}
            className="task-detail-more-menu floating-panel"
            role="menu"
            ariaLabel={words.moreActions}
            minWidth={156}
          >
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={() => {
                setShowMoreActions(false);
                setShowDeleteConfirm(true);
              }}
            >
              <Trash2 size={15} />
              {t('deleteTask')}
            </button>
          </FloatingLayer>
          <button
            type="button"
            className={`task-detail-complete ${task.completedAt ? 'is-completed' : ''}`}
            onClick={() => void handleTaskCompletion()}
          >
            {task.completedAt ? <Circle size={16} /> : <Check size={16} />}
            {task.completedAt ? words.reopenTask : words.completeTask}
          </button>
        </div>
      </header>

      <section className="task-detail-summary" aria-labelledby="task-detail-title">
        <input
          id="task-detail-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={finishComposition}
          placeholder={t('taskTitle')}
          className="task-detail-title"
          aria-label={t('taskTitle')}
        />
        <div className="task-detail-chips">
          <PriorityBadge priority={priority} />
          <span className={`task-detail-chip ${task.completedAt ? 'is-complete' : ''}`}>
            {task.completedAt ? <CheckCircle2 size={13} /> : <Circle size={13} />}
            {task.completedAt ? words.completed : words.incomplete}
          </span>
          {dueSummary && (
            <span className="task-detail-chip">
              <Calendar size={13} />
              {dueSummary}
            </span>
          )}
        </div>
      </section>

      <section className="task-detail-island task-detail-properties" data-ui="task-properties">
        <div className="task-detail-island-heading">
          <SlidersHorizontal size={17} />
          <h2>{words.properties}</h2>
        </div>

        <div className="task-detail-property-grid">
          <div className={`task-detail-property-card ${showAdvancedDate ? 'is-wide' : ''}`}>
            <div className="task-detail-property-heading">
              <span>
                <Calendar size={15} />
                {words.dateAndTime}
              </span>
              <button type="button" onClick={() => setShowAdvancedDate((shown) => !shown)}>
                {showAdvancedDate ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {showAdvancedDate ? t('collapseAdv') : t('advOptions')}
              </button>
            </div>
            {!showAdvancedDate && (
              <div className="task-detail-date-row">
                <DateTimePicker
                  type="date"
                  value={dueDate}
                  onChange={setDueDate}
                  aria-label={t('dueDate')}
                  className="task-detail-field"
                />
                {task.dueTime && <span className="task-detail-time-value">{task.dueTime}</span>}
              </div>
            )}
            {showAdvancedDate && (
              <div className="task-detail-advanced-dates">
                {[
                  {
                    value: dateStart,
                    change: setDateStart,
                    dateLabel: t('startDate'),
                    timeLabel: t('startTime'),
                  },
                  {
                    value: dateEnd,
                    change: setDateEnd,
                    dateLabel: t('endDate'),
                    timeLabel: t('endTime'),
                  },
                ].map((field) => {
                  const [date = '', time = ''] = field.value.split('T');
                  return (
                    <div key={field.dateLabel} className="task-detail-advanced-field">
                      <span>{field.dateLabel}</span>
                      <div className="gt-datetime-fields">
                        <DateTimePicker
                          type="date"
                          value={date}
                          aria-label={field.dateLabel}
                          onChange={(next) =>
                            field.change(next ? `${next}${time ? `T${time}` : ''}` : '')
                          }
                          className="task-detail-field"
                        />
                        <DateTimePicker
                          type="time"
                          value={time.slice(0, 5)}
                          aria-label={field.timeLabel}
                          disabled={!date}
                          onChange={(next) => field.change(`${date}${next ? `T${next}` : ''}`)}
                          className="task-detail-field"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="task-detail-property-card">
            <div className="task-detail-property-heading">
              <span>
                <Tag size={15} />
                {t('tagName')}
              </span>
            </div>
            <div className="task-detail-tags-row">
              <div className="task-detail-tag-chips">
                {taskTagNames.length === 0 ? (
                  <span className="task-detail-tag-empty">{t('noTags')}</span>
                ) : (
                  taskTagNames.map((name) => (
                    <span className="task-detail-tag-chip" key={name} title={name}>
                      {name}
                    </span>
                  ))
                )}
              </div>
              <button
                ref={tagAnchorRef}
                type="button"
                className="task-detail-tag-add"
                aria-expanded={showTagPicker}
                onClick={() => setShowTagPicker((open) => !open)}
              >
                {t('addTag')}
              </button>
            </div>
          </div>

          <div className="task-detail-property-card">
            <div className="task-detail-property-heading">
              <span>
                <AlertCircle size={15} />
                {t('priority')}
              </span>
              <button
                type="button"
                className={`task-detail-flag ${isFlagged ? 'is-active' : ''}`}
                onClick={() => setIsFlagged((flagged) => !flagged)}
              >
                <Flag size={14} fill={isFlagged ? 'currentColor' : 'none'} />
                {t('flag')}
              </button>
            </div>
            <div className="task-detail-priority-options">
              {(['high', 'medium', 'low'] as Priority[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={priority === option ? 'is-active' : ''}
                  onClick={() => setPriority(option)}
                >
                  <PriorityBadge priority={option} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <TaskPlanningDetails task={task} />
      </section>

      <section className="task-detail-island task-detail-notes">
        <div className="task-detail-island-heading">
          <FileText size={17} />
          <h2>{t('notes')}</h2>
        </div>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={finishComposition}
          placeholder={t('notesPlaceholder')}
          rows={3}
          className="task-detail-notes-input"
        />
      </section>

      <section className="task-detail-island task-detail-subtasks-island">
        <span className="task-detail-section-icon" aria-hidden="true">
          <ListChecks size={17} />
        </span>
        <SubTaskSection
          taskId={task.id!}
          canAdd={!task.completedAt}
          onChange={() => setSubtaskChanged(true)}
        />
      </section>

      <TaskDeleteDialog
        task={task}
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onDeleted={() => navigate('/app/all', { replace: true })}
      />
      <TaskTagPicker
        open={showTagPicker}
        taskIds={currentTaskIds}
        anchorRef={tagAnchorRef}
        onClose={() => setShowTagPicker(false)}
        onChanged={refreshTaskTags}
      />
    </div>
  );
}
