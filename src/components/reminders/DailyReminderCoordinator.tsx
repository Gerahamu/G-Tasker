import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportSaveFailure } from '../../autosave/autosave-engine';
import {
  DAILY_REMINDER_SETTINGS_CHANGED,
  buildDailyReminderSummary,
  canSnoozeMorning,
  claimDailyReminder,
  evaluateAndSyncDailyReminders,
  readDailyReminderSettings,
  readDailyReminderState,
  readNotificationMasterEnabled,
  readOverdueReminderEnabled,
  snoozeMorningReminder,
  taskDateMovePatch,
  tomorrowISO,
  type DailyReminderCandidate,
} from '../../lib/daily-reminders';
import type { Task } from '../../lib/types';
import { useTaskStore } from '../../stores/task-store';
import { useUIStore } from '../../stores/ui-store';
import { useT } from '../../lib/i18n';
import { DailyReminderModal } from './DailyReminderModal';

const CHECK_INTERVAL_MS = 30_000;

export function DailyReminderCoordinator() {
  const navigate = useNavigate();
  const { t } = useT();
  const tasks = useTaskStore((state) => state.tasks);
  const isLoading = useTaskStore((state) => state.isLoading);
  const updateTask = useTaskStore((state) => state.updateTask);
  const showCreateModal = useUIStore((state) => state.showCreateModal);
  const addToast = useUIStore((state) => state.addToast);
  const [activeReminder, setActiveReminder] = useState<DailyReminderCandidate | null>(null);
  const activeReminderRef = useRef<DailyReminderCandidate | null>(null);
  const checkRef = useRef<() => void>(() => undefined);
  const summary = buildDailyReminderSummary(tasks, new Date(), {
    includeOverdue: readOverdueReminderEnabled(),
  });

  useEffect(() => {
    activeReminderRef.current = activeReminder;
  }, [activeReminder]);

  const checkReminder = useCallback(() => {
    if (
      isLoading ||
      showCreateModal ||
      activeReminderRef.current ||
      document.visibilityState !== 'visible' ||
      document.querySelector('[aria-modal="true"]')
    ) {
      return;
    }
    if (!readNotificationMasterEnabled()) return;
    const now = new Date();
    const currentTasks = useTaskStore.getState().tasks;
    const currentSummary = buildDailyReminderSummary(currentTasks, now, {
      includeOverdue: readOverdueReminderEnabled(),
    });
    const hasRelevantTasks =
      currentSummary.todayTasks.length > 0 || currentSummary.overdueTasks.length > 0;
    const candidate = evaluateAndSyncDailyReminders(
      now,
      readDailyReminderSettings(),
      hasRelevantTasks,
    );
    if (!candidate) return;
    claimDailyReminder(candidate, now);
    activeReminderRef.current = candidate;
    setActiveReminder(candidate);
  }, [isLoading, showCreateModal]);

  useEffect(() => {
    checkRef.current = checkReminder;
    checkReminder();
  }, [checkReminder]);

  useEffect(() => {
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') checkRef.current();
    };
    const timer = window.setInterval(() => checkRef.current(), CHECK_INTERVAL_MS);
    window.addEventListener('focus', checkWhenVisible);
    window.addEventListener(DAILY_REMINDER_SETTINGS_CHANGED, checkWhenVisible);
    document.addEventListener('visibilitychange', checkWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', checkWhenVisible);
      window.removeEventListener(DAILY_REMINDER_SETTINGS_CHANGED, checkWhenVisible);
      document.removeEventListener('visibilitychange', checkWhenVisible);
    };
  }, []);

  const closeReminder = () => {
    activeReminderRef.current = null;
    setActiveReminder(null);
    window.setTimeout(() => checkRef.current(), 250);
  };

  const handleSnooze = () => {
    snoozeMorningReminder(new Date());
    closeReminder();
  };

  const handleViewToday = () => {
    activeReminderRef.current = null;
    setActiveReminder(null);
    navigate('/app/today');
  };

  const handleMoveTask = async (task: Task, date: string) => {
    if (task.id === undefined) return;
    try {
      updateTask(task.id, taskDateMovePatch(task, date));
      await useTaskStore.getState().saveDirtyTasks();
      addToast(t('taskDateUpdated'), 'success');
    } catch {
      reportSaveFailure();
    }
  };

  if (!activeReminder) return null;
  const now = new Date();
  return (
    <DailyReminderModal
      kind={activeReminder.kind}
      source={activeReminder.source}
      summary={summary}
      canSnooze={canSnoozeMorning(now, readDailyReminderState())}
      tomorrow={tomorrowISO(now)}
      onClose={closeReminder}
      onSnooze={handleSnooze}
      onViewToday={handleViewToday}
      onMoveTask={handleMoveTask}
    />
  );
}
