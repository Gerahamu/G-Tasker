import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, Clock3, Moon, Sun, X } from 'lucide-react';
import type { Task } from '../../lib/types';
import type {
  DailyReminderKind,
  DailyReminderSource,
  DailyReminderSummary,
} from '../../lib/daily-reminders';
import { useT } from '../../lib/i18n';
import { todayISO } from '../../lib/format-date';

interface DailyReminderModalProps {
  kind: DailyReminderKind;
  source: DailyReminderSource;
  summary: DailyReminderSummary;
  canSnooze: boolean;
  tomorrow: string;
  onClose: () => void;
  onSnooze: () => void;
  onViewToday: () => void;
  onMoveTask: (task: Task, date: string) => Promise<void>;
}

function taskTime(task: Task): string | null {
  if (task.dateStart?.slice(0, 10) === todayISO() && task.dateStart.includes('T')) {
    return task.dateStart.slice(11, 16);
  }
  return task.dueTime;
}

export function DailyReminderModal({
  kind,
  source,
  summary,
  canSnooze,
  tomorrow,
  onClose,
  onSnooze,
  onViewToday,
  onMoveTask,
}: DailyReminderModalProps) {
  const { t } = useT();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingDate, setEditingDate] = useState(tomorrow);
  const [pendingTaskId, setPendingTaskId] = useState<number | null>(null);
  const [keptTaskIds, setKeptTaskIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && pendingTaskId === null) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.requestAnimationFrame(() => previousFocusRef.current?.focus({ preventScroll: true }));
    };
  }, [onClose, pendingTaskId]);

  const moveTask = async (task: Task, date: string) => {
    if (task.id === undefined || pendingTaskId !== null) return;
    setPendingTaskId(task.id);
    try {
      await onMoveTask(task, date);
      setEditingTaskId(null);
    } finally {
      setPendingTaskId(null);
    }
  };

  const renderTaskLabel = (task: Task) => {
    const time = taskTime(task);
    return (
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
          {task.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
          {time && (
            <>
              <Clock3 size={12} /> {time}
            </>
          )}
          {kind === 'evening' && task.dueDate && <span>{task.dueDate}</span>}
        </p>
      </div>
    );
  };

  const taskList = kind === 'morning' ? summary.morningTasks : summary.eveningTasks;
  const title = kind === 'morning' ? t('morningReminderTitle') : t('eveningReminderTitle');

  return createPortal(
    <div
      className="modal-backdrop modal-backdrop-scroll animate-fade-in daily-reminder-backdrop"
      onClick={() => pendingTaskId === null && onClose()}
    >
      <div
        ref={panelRef}
        className="modal-panel gt-modal daily-reminder-modal animate-modal-in"
        data-ui={`daily-${kind}-reminder`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header daily-reminder-header">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`daily-reminder-icon daily-reminder-icon-${kind}`}>
              {kind === 'morning' ? <Sun size={20} /> : <Moon size={20} />}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {kind === 'morning' ? t('morningReminder') : t('eveningReminder')}
              </p>
              <h2
                id={titleId}
                className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                {title}
              </h2>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="gt-button-icon"
            aria-label={t('closeReminder')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="daily-reminder-body">
          {kind === 'morning' ? (
            <div className="daily-reminder-stats" aria-label={t('morningReminder')}>
              <div>
                <strong>{summary.todayTasks.length}</strong>
                <span>{t('todayTaskCount')}</span>
              </div>
              <div>
                <strong>{summary.todayIncomplete.length}</strong>
                <span>{t('todayIncompleteCount')}</span>
              </div>
              <div>
                <strong>{summary.overdueTasks.length}</strong>
                <span>{t('overdueTaskCount')}</span>
              </div>
            </div>
          ) : (
            <div className="daily-reminder-progress">
              <span className="daily-reminder-progress-value">
                {summary.todayCompleted.length} / {summary.todayTasks.length}
              </span>
              <span>
                {t('todayProgress', {
                  completed: summary.todayCompleted.length,
                  total: summary.todayTasks.length,
                })}
              </span>
              <div className="daily-reminder-progress-track" aria-hidden="true">
                <span
                  style={{
                    width: `${summary.todayTasks.length ? Math.round((summary.todayCompleted.length / summary.todayTasks.length) * 100) : 0}%`,
                  }}
                />
              </div>
              <div className="daily-reminder-evening-counts">
                <span>
                  {t('todayIncompleteCount')} · {summary.todayIncomplete.length}
                </span>
                <span>
                  {t('overdueTaskCount')} · {summary.overdueTasks.length}
                </span>
              </div>
            </div>
          )}

          <section className="daily-reminder-section">
            <h3>{kind === 'morning' ? t('mainTasks') : t('unfinishedTasks')}</h3>
            {taskList.length === 0 ? (
              <div className="daily-reminder-empty">
                <CalendarDays size={20} />
                <span>{t('noReminderTasks')}</span>
              </div>
            ) : (
              <div className="daily-reminder-task-list">
                {taskList.map((task) => {
                  const id = task.id!;
                  const kept = keptTaskIds.has(id);
                  return (
                    <div key={id} className="daily-reminder-task-row">
                      <div className="daily-reminder-task-main">{renderTaskLabel(task)}</div>
                      {kind === 'evening' && (
                        <div className="daily-reminder-task-actions">
                          {kept ? (
                            <span className="daily-reminder-kept">
                              <Check size={13} /> {t('originalDateKept')}
                            </span>
                          ) : editingTaskId === id ? (
                            <div className="daily-reminder-date-editor">
                              <input
                                type="date"
                                value={editingDate}
                                aria-label={t('changeTaskDate')}
                                onChange={(event) => setEditingDate(event.target.value)}
                                className="gt-field px-2 py-1 text-xs"
                              />
                              <button
                                type="button"
                                disabled={!editingDate || pendingTaskId !== null}
                                onClick={() => void moveTask(task, editingDate)}
                                className="gt-button-primary px-2.5 py-1 text-xs"
                              >
                                {t('applyTaskDate')}
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={pendingTaskId !== null}
                                onClick={() => void moveTask(task, tomorrow)}
                                className="gt-button-secondary px-2.5 py-1 text-xs"
                              >
                                {t('moveToTomorrow')}
                              </button>
                              <button
                                type="button"
                                disabled={pendingTaskId !== null}
                                onClick={() => {
                                  setEditingTaskId(id);
                                  setEditingDate(task.dueDate ?? tomorrow);
                                }}
                                className="gt-button-secondary px-2.5 py-1 text-xs"
                              >
                                {t('changeTaskDate')}
                              </button>
                              <button
                                type="button"
                                disabled={pendingTaskId !== null}
                                onClick={() =>
                                  setKeptTaskIds((current) => new Set(current).add(id))
                                }
                                className="gt-button-ghost px-2.5 py-1 text-xs text-gray-500"
                              >
                                {t('keepOriginalDate')}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="modal-actions daily-reminder-actions">
          <button
            type="button"
            onClick={onViewToday}
            className="gt-button-secondary px-4 py-2 text-sm"
          >
            {t('viewTodayTasks')}
          </button>
          <div className="flex flex-wrap justify-end gap-2">
            {kind === 'morning' && source === 'scheduled' && canSnooze && (
              <button
                type="button"
                onClick={onSnooze}
                className="gt-button-secondary px-4 py-2 text-sm"
              >
                {t('snoozeThirtyMinutes')}
              </button>
            )}
            <button type="button" onClick={onClose} className="gt-button-primary px-4 py-2 text-sm">
              {kind === 'morning' ? t('closeReminder') : t('endToday')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
