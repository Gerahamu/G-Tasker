import { useEffect, useMemo, useState } from 'react';
import { db } from '../../db/database';
import { useClockStore } from '../../stores/clock-store';
import { useTaskStore } from '../../stores/task-store';
import {
  buildDailyReminderSummary,
  readDailyReminderSettings,
  readNotificationMasterEnabled,
  readNotificationSoundEnabled,
  readOverdueReminderEnabled,
  DAILY_REMINDER_SETTINGS_CHANGED,
} from '../../lib/daily-reminders';
import type { DesktopReminderSchedule } from '../../lib/desktop-reminder-types';
import { getTaskReminderAt, taskReminderTitle } from '../../lib/task-reminders';
import type { Task } from '../../lib/types';

function buildSchedule(
  alarms: ReturnType<typeof useClockStore.getState>['alarms'],
  countdowns: ReturnType<typeof useClockStore.getState>['countdowns'],
  tasks: Task[],
): DesktopReminderSchedule {
  const dailySettings = readDailyReminderSettings();
  const summary = buildDailyReminderSummary(tasks, new Date(), {
    includeOverdue: readOverdueReminderEnabled(),
  });

  return {
    version: 1,
    alarms: alarms.flatMap((alarm) =>
      alarm.id == null
        ? []
        : [
            {
              id: alarm.id,
              name: alarm.name,
              hour: alarm.hour,
              minute: alarm.minute,
              enabled: alarm.enabled,
              repeatRule: alarm.repeatRule,
              soundName: alarm.soundName,
              volume: alarm.volume,
              snoozeEnabled: alarm.snoozeEnabled,
              snoozeMinutes: alarm.snoozeMinutes,
            },
          ],
    ),
    countdowns: countdowns.flatMap((countdown) =>
      countdown.id == null
        ? []
        : [
            {
              id: countdown.id,
              name: countdown.name,
              status: countdown.status,
              expectedEndTimestamp: countdown.expectedEndTimestamp,
              soundName: countdown.soundName,
              volume: countdown.volume,
            },
        ],
    ),
    taskReminders: tasks.flatMap((task) => {
      if (task.id === undefined) return [];
      const reminderAt = getTaskReminderAt(task);
      if (!reminderAt || reminderAt.getTime() <= Date.now()) return [];
      return [{ id: task.id, title: taskReminderTitle(task), reminderAt: reminderAt.toISOString() }];
    }),
    daily: {
      ...dailySettings,
      hasRelevantTasks: summary.todayTasks.length > 0 || summary.overdueTasks.length > 0,
      notificationEnabled: readNotificationMasterEnabled(),
      soundEnabled: readNotificationSoundEnabled(),
    },
  };
}

export function ClockReminderCoordinator() {
  const alarms = useClockStore((state) => state.alarms);
  const countdowns = useClockStore((state) => state.countdowns);
  const loadAlarms = useClockStore((state) => state.loadAlarms);
  const loadCountdowns = useClockStore((state) => state.loadCountdowns);
  const loadClockSettings = useClockStore((state) => state.loadClockSettings);
  const loadStopwatch = useClockStore((state) => state.loadStopwatch);
  const loadTimezones = useClockStore((state) => state.loadTimezones);
  const startPolling = useClockStore((state) => state.startPolling);
  const stopPolling = useClockStore((state) => state.stopPolling);
  const tasks = useTaskStore((state) => state.tasks);
  const [loaded, setLoaded] = useState(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [settingsRevision, setSettingsRevision] = useState(0);
  const desktopBridge = window.gtaskerReminders;

  useEffect(() => {
    let active = true;
    void db.tasks.toArray().then((persistedTasks) => {
      if (!active) return;
      const currentTasks = new Map(
        useTaskStore
          .getState()
          .tasks.filter((task) => task.id !== undefined)
          .map((task) => [task.id!, task]),
      );
      const merged = persistedTasks.map((task) => currentTasks.get(task.id!) ?? task);
      for (const task of currentTasks.values()) {
        if (!merged.some((candidate) => candidate.id === task.id)) merged.push(task);
      }
      setAllTasks(merged);
    });
    return () => {
      active = false;
    };
  }, [tasks]);

  const schedule = useMemo(() => {
    // The revision invalidates the memo when localStorage-backed settings change.
    void settingsRevision;
    return buildSchedule(alarms, countdowns, allTasks);
  }, [alarms, allTasks, countdowns, settingsRevision]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadAlarms(),
      loadCountdowns(),
      loadClockSettings(),
      loadStopwatch(),
      loadTimezones(),
    ]).finally(() => {
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [loadAlarms, loadClockSettings, loadCountdowns, loadStopwatch, loadTimezones]);

  useEffect(() => {
    const handleSettingsChange = () => setSettingsRevision((value) => value + 1);
    window.addEventListener(DAILY_REMINDER_SETTINGS_CHANGED, handleSettingsChange);
    return () => window.removeEventListener(DAILY_REMINDER_SETTINGS_CHANGED, handleSettingsChange);
  }, []);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  useEffect(() => {
    if (!desktopBridge || !loaded) return;
    const timer = window.setTimeout(() => {
      void desktopBridge.syncSchedule(schedule);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [desktopBridge, loaded, schedule]);

  return null;
}
