import { create } from 'zustand';
import { db } from '../db/database';
import type {
  ClockTimezone,
  StopwatchState,
  StopwatchLap,
  Countdown,
  Alarm,
  AlarmTriggerRecord,
  ClockSettings,
  ReminderEvent,
} from '../lib/clock-types';
import {
  calcElapsedMs,
  calcRemainingSeconds,
  calcNextRingTime,
  formatStopwatch as fmtSw,
} from '../lib/time-utils';
import { reminderEngine } from '../lib/reminder-engine';

// ──── Default settings ────
export function getDefaultClockSettings(): Omit<ClockSettings, 'id'> {
  return {
    timeFormat: '24h',
    showSeconds: true,
    defaultSound: 'beep',
    defaultVolume: 0.7,
    defaultSnoozeMinutes: 9,
    notificationPermission: 'default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ──── Tab visibility tracker ────
export function useTabVisible(): boolean {
  // This is a hook-compatible approach; for the store we manage it differently
  return document.visibilityState === 'visible';
}

// ──── Polling interval ID storage ────
let pollIntervalId: ReturnType<typeof setInterval> | null = null;

interface ClockStoreState {
  // Active tab
  activeTab: 'worldclock' | 'stopwatch' | 'countdown' | 'alarm';

  // World Clock
  timezones: ClockTimezone[];
  localTz: string;

  // Stopwatch
  stopwatch: StopwatchState | null;
  stopwatchDisplay: string; // updated by polling

  // Countdowns
  countdowns: Countdown[];
  countdownDisplays: Record<number, number>; // id -> remaining seconds

  // Alarms
  alarms: Alarm[];
  triggerRecords: AlarmTriggerRecord[];

  // Settings
  clockSettings: ClockSettings | null;

  // Active reminders shown in UI
  activeReminders: ReminderEvent[];

  // Actions
  setActiveTab: (tab: ClockStoreState['activeTab']) => void;

  // World Clock actions
  loadTimezones: () => Promise<void>;
  addTimezone: (tz: Omit<ClockTimezone, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTimezone: (id: number, updates: Partial<ClockTimezone>) => Promise<void>;
  deleteTimezone: (id: number) => Promise<void>;
  setPrimaryTimezone: (id: number) => Promise<void>;
  reorderTimezones: (fromIndex: number, toIndex: number) => Promise<void>;

  // Stopwatch actions
  loadStopwatch: () => Promise<void>;
  stopwatchStart: () => Promise<void>;
  stopwatchPause: () => Promise<void>;
  stopwatchResume: () => Promise<void>;
  stopwatchReset: () => Promise<void>;
  stopwatchLap: () => Promise<void>;
  stopwatchDeleteLap: (lapNumber: number) => Promise<void>;
  stopwatchClearLaps: () => Promise<void>;
  tickStopwatch: () => void;

  // Countdown actions
  loadCountdowns: () => Promise<void>;
  createCountdown: (cd: Omit<Countdown, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCountdown: (id: number, updates: Partial<Countdown>) => Promise<void>;
  deleteCountdown: (id: number) => Promise<void>;
  countdownStart: (id: number) => Promise<void>;
  countdownPause: (id: number) => Promise<void>;
  countdownResume: (id: number) => Promise<void>;
  countdownReset: (id: number) => Promise<void>;
  countdownComplete: (id: number) => Promise<void>;
  tickCountdowns: () => void;
  checkExpiredCountdowns: () => void;

  // Alarm actions
  loadAlarms: () => Promise<void>;
  createAlarm: (alarm: Omit<Alarm, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAlarm: (id: number, updates: Partial<Alarm>) => Promise<void>;
  deleteAlarm: (id: number) => Promise<void>;
  toggleAlarm: (id: number) => Promise<void>;
  checkAlarms: () => void;

  // Settings actions
  loadClockSettings: () => Promise<void>;
  updateClockSettings: (updates: Partial<ClockSettings>) => Promise<void>;

  // Reminder management
  dismissReminder: (eventId: string) => void;
  snoozeReminder: (eventId: string) => void;
  showReminder: (event: ReminderEvent) => void;

  // Polling
  startPolling: () => void;
  stopPolling: () => void;
}

export const useClockStore = create<ClockStoreState>((set, get) => ({
  activeTab: 'worldclock',
  timezones: [],
  localTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  stopwatch: null,
  stopwatchDisplay: '00:00.00',
  countdowns: [],
  countdownDisplays: {},
  alarms: [],
  triggerRecords: [],
  clockSettings: null,
  activeReminders: [],

  setActiveTab: (activeTab) => set({ activeTab }),

  // ──── World Clock ────
  loadTimezones: async () => {
    const timezones = await db.clockTimezones.orderBy('order').toArray();
    set({ timezones });
  },

  addTimezone: async (tz) => {
    const maxOrder = (await db.clockTimezones.orderBy('order').last())?.order ?? 0;
    const now = new Date().toISOString();
    await db.clockTimezones.add({ ...tz, order: maxOrder + 1, createdAt: now, updatedAt: now });
    await get().loadTimezones();
  },

  updateTimezone: async (id, updates) => {
    await db.clockTimezones.update(id, { ...updates, updatedAt: new Date().toISOString() });
    await get().loadTimezones();
  },

  deleteTimezone: async (id) => {
    await db.clockTimezones.delete(id);
    await get().loadTimezones();
  },

  setPrimaryTimezone: async (id) => {
    const tzs = await db.clockTimezones.toArray();
    for (const tz of tzs) {
      await db.clockTimezones.update(tz.id!, { isPrimary: tz.id === id });
    }
    await get().loadTimezones();
  },

  reorderTimezones: async () => {
    // Simple: just reload — DnD reordering handled by the component
    await get().loadTimezones();
  },

  // ──── Stopwatch ────
  loadStopwatch: async () => {
    let sw = await db.stopwatchState.get(1);
    if (!sw) {
      sw = {
        id: 1,
        isRunning: false,
        startTimestamp: null,
        accumulatedMs: 0,
        laps: [],
        lastUpdatedAt: new Date().toISOString(),
      };
      await db.stopwatchState.put(sw);
    }
    // Recalculate on load
    const display = calcElapsedMs(sw.startTimestamp, sw.accumulatedMs, sw.isRunning);
    set({ stopwatch: sw, stopwatchDisplay: fmtSw(display) });
  },

  stopwatchStart: async () => {
    const now = Date.now();
    const sw = get().stopwatch;
    if (!sw) return;
    const updated: StopwatchState = {
      ...sw,
      isRunning: true,
      startTimestamp: now,
      lastUpdatedAt: new Date().toISOString(),
    };
    await db.stopwatchState.put(updated);
    set({ stopwatch: updated });
  },

  stopwatchPause: async () => {
    const sw = get().stopwatch;
    if (!sw || !sw.isRunning || !sw.startTimestamp) return;
    const elapsed = Date.now() - sw.startTimestamp;
    const updated: StopwatchState = {
      ...sw,
      isRunning: false,
      startTimestamp: null,
      accumulatedMs: sw.accumulatedMs + elapsed,
      lastUpdatedAt: new Date().toISOString(),
    };
    await db.stopwatchState.put(updated);
    set({ stopwatch: updated });
  },

  stopwatchResume: async () => {
    const sw = get().stopwatch;
    if (!sw || sw.isRunning) return;
    const updated: StopwatchState = {
      ...sw,
      isRunning: true,
      startTimestamp: Date.now(),
      lastUpdatedAt: new Date().toISOString(),
    };
    await db.stopwatchState.put(updated);
    set({ stopwatch: updated });
  },

  stopwatchReset: async () => {
    const sw = get().stopwatch;
    if (!sw) return;
    const updated: StopwatchState = {
      ...sw,
      isRunning: false,
      startTimestamp: null,
      accumulatedMs: 0,
      laps: [],
      lastUpdatedAt: new Date().toISOString(),
    };
    await db.stopwatchState.put(updated);
    set({ stopwatch: updated, stopwatchDisplay: fmtSw(0) });
  },

  stopwatchLap: async () => {
    const sw = get().stopwatch;
    if (!sw || !sw.isRunning) return;
    const elapsed = calcElapsedMs(sw.startTimestamp, sw.accumulatedMs, sw.isRunning);
    const prevTotal = sw.laps.length > 0 ? sw.laps[sw.laps.length - 1].totalTime : 0;
    const lapTime = elapsed - prevTotal;
    const lap: StopwatchLap = {
      lapNumber: sw.laps.length + 1,
      lapTime,
      totalTime: elapsed,
      timestamp: new Date().toISOString(),
    };
    const updated: StopwatchState = {
      ...sw,
      laps: [...sw.laps, lap],
      lastUpdatedAt: new Date().toISOString(),
    };
    await db.stopwatchState.put(updated);
    set({ stopwatch: updated });
  },

  stopwatchDeleteLap: async (lapNumber) => {
    const sw = get().stopwatch;
    if (!sw) return;
    const laps = sw.laps
      .filter((l) => l.lapNumber !== lapNumber)
      .map((l, i) => ({
        ...l,
        lapNumber: i + 1,
      }));
    const updated: StopwatchState = { ...sw, laps };
    await db.stopwatchState.put(updated);
    set({ stopwatch: updated });
  },

  stopwatchClearLaps: async () => {
    const sw = get().stopwatch;
    if (!sw) return;
    const updated: StopwatchState = { ...sw, laps: [] };
    await db.stopwatchState.put(updated);
    set({ stopwatch: updated });
  },

  tickStopwatch: () => {
    const sw = get().stopwatch;
    if (!sw || !sw.isRunning) return;
    const elapsed = calcElapsedMs(sw.startTimestamp, sw.accumulatedMs, true);
    set({ stopwatchDisplay: fmtSw(elapsed) });
  },

  // ──── Countdowns ────
  loadCountdowns: async () => {
    const countdowns = await db.countdowns.toArray();
    const displays: Record<number, number> = {};
    for (const cd of countdowns) {
      if (cd.id != null) {
        displays[cd.id] = calcRemainingSeconds(
          cd.status,
          cd.startTimestamp,
          cd.remainingAtPause,
          cd.totalSeconds,
        );
      }
    }
    set({ countdowns, countdownDisplays: displays });
  },

  createCountdown: async (cd) => {
    const now = new Date().toISOString();
    await db.countdowns.add({ ...cd, createdAt: now, updatedAt: now });
    await get().loadCountdowns();
  },

  updateCountdown: async (id, updates) => {
    await db.countdowns.update(id, { ...updates, updatedAt: new Date().toISOString() });
    await get().loadCountdowns();
  },

  deleteCountdown: async (id) => {
    await db.countdowns.delete(id);
    await get().loadCountdowns();
  },

  countdownStart: async (id) => {
    const cds = get().countdowns;
    const cd = cds.find((c) => c.id === id);
    if (!cd) return;
    const remaining =
      cd.status === 'paused' ? (cd.remainingAtPause ?? cd.totalSeconds) : cd.totalSeconds;
    await db.countdowns.update(id, {
      status: 'running',
      startTimestamp: Date.now(),
      remainingAtPause: remaining,
      expectedEndTimestamp: new Date(Date.now() + remaining * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await get().loadCountdowns();
  },

  countdownPause: async (id) => {
    const cds = get().countdowns;
    const cd = cds.find((c) => c.id === id);
    if (!cd || cd.status !== 'running') return;
    const remaining = calcRemainingSeconds(
      cd.status,
      cd.startTimestamp,
      cd.remainingAtPause,
      cd.totalSeconds,
    );
    await db.countdowns.update(id, {
      status: 'paused',
      startTimestamp: null,
      remainingAtPause: remaining,
      updatedAt: new Date().toISOString(),
    });
    await get().loadCountdowns();
  },

  countdownResume: async (id) => {
    const cds = get().countdowns;
    const cd = cds.find((c) => c.id === id);
    if (!cd || cd.status !== 'paused') return;
    const remaining = cd.remainingAtPause ?? cd.totalSeconds;
    await db.countdowns.update(id, {
      status: 'running',
      startTimestamp: Date.now(),
      remainingAtPause: remaining,
      expectedEndTimestamp: new Date(Date.now() + remaining * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await get().loadCountdowns();
  },

  countdownReset: async (id) => {
    const cds = get().countdowns;
    const cd = cds.find((c) => c.id === id);
    if (!cd) return;
    await db.countdowns.update(id, {
      status: 'idle',
      startTimestamp: null,
      remainingAtPause: null,
      expectedEndTimestamp: null,
      updatedAt: new Date().toISOString(),
    });
    await get().loadCountdowns();
  },

  countdownComplete: async (id) => {
    await db.countdowns.update(id, {
      status: 'completed',
      startTimestamp: null,
      remainingAtPause: 0,
      updatedAt: new Date().toISOString(),
    });
    await get().loadCountdowns();
  },

  tickCountdowns: () => {
    const cds = get().countdowns;
    const displays: Record<number, number> = {};
    for (const cd of cds) {
      if (cd.id != null) {
        displays[cd.id] = calcRemainingSeconds(
          cd.status,
          cd.startTimestamp,
          cd.remainingAtPause,
          cd.totalSeconds,
        );
      }
    }
    set({ countdownDisplays: displays });
  },

  checkExpiredCountdowns: () => {
    const cds = get().countdowns;
    for (const cd of cds) {
      if (cd.status !== 'running' || cd.id == null) continue;
      const remaining = calcRemainingSeconds(
        cd.status,
        cd.startTimestamp,
        cd.remainingAtPause,
        cd.totalSeconds,
      );
      if (remaining <= 0) {
        // Mark synchronously in memory before the next 200ms poll, then persist.
        set((state) => ({
          countdowns: state.countdowns.map((countdown) =>
            countdown.id === cd.id
              ? {
                  ...countdown,
                  status: 'completed',
                  startTimestamp: null,
                  remainingAtPause: 0,
                  updatedAt: new Date().toISOString(),
                }
              : countdown,
          ),
          countdownDisplays: { ...state.countdownDisplays, [cd.id!]: 0 },
        }));
        void get().countdownComplete(cd.id!);
        // Trigger reminder
        const event: ReminderEvent = {
          id: `cd-${cd.id}-${Date.now()}`,
          source: 'countdown',
          sourceId: cd.id,
          name: cd.name || 'Countdown',
          triggeredAt: new Date().toISOString(),
          soundName: cd.soundName,
          volume: cd.volume,
          snoozeEnabled: false,
          snoozeMinutes: 0,
        };
        reminderEngine.trigger(event);
        reminderEngine.sendSystemNotification('Countdown', `${cd.name || 'Countdown'} finished!`);
        // Flash title
        const origTitle = document.title;
        document.title = `⏰ ${cd.name || 'Countdown'} finished!`;
        setTimeout(() => {
          document.title = origTitle;
        }, 5000);
      }
    }
  },

  // ──── Alarms ────
  loadAlarms: async () => {
    const [alarms, triggerRecords] = await Promise.all([
      db.alarms.toArray(),
      db.alarmTriggerRecords.toArray(),
    ]);
    set({ alarms, triggerRecords });
  },

  createAlarm: async (alarm) => {
    const now = new Date().toISOString();
    await db.alarms.add({ ...alarm, createdAt: now, updatedAt: now });
    await get().loadAlarms();
  },

  updateAlarm: async (id, updates) => {
    await db.alarms.update(id, { ...updates, updatedAt: new Date().toISOString() });
    await get().loadAlarms();
  },

  deleteAlarm: async (id) => {
    await db.alarms.delete(id);
    await db.alarmTriggerRecords.where('alarmId').equals(id).delete();
    await get().loadAlarms();
  },

  toggleAlarm: async (id) => {
    const al = get().alarms.find((a) => a.id === id);
    if (!al) return;
    await db.alarms.update(id, { enabled: !al.enabled, updatedAt: new Date().toISOString() });
    await get().loadAlarms();
  },

  checkAlarms: () => {
    const { alarms, triggerRecords } = get();
    const now = new Date();

    for (const al of alarms) {
      if (!al.enabled || al.id == null) continue;
      const nextRing = calcNextRingTime(al.hour, al.minute, al.repeatRule);
      if (!nextRing) continue;

      // Check if this alarm should trigger now
      const diffMs = nextRing.getTime() - now.getTime();
      const withinWindow = diffMs <= 1000 && diffMs > -55000; // within 1s before or 55s after

      if (!withinWindow) continue;

      // Check if already triggered in this cycle
      const prevTrigger = triggerRecords.find((r) => r.alarmId === al.id);
      if (prevTrigger) {
        const prevTime = new Date(prevTrigger.triggeredAt).getTime();
        // If triggered within the last minute, skip
        if (now.getTime() - prevTime < 60000) continue;
      }

      // Trigger!
      const event: ReminderEvent = {
        id: `alarm-${al.id}-${Date.now()}`,
        source: 'alarm',
        sourceId: al.id,
        name: al.name || 'Alarm',
        triggeredAt: now.toISOString(),
        soundName: al.soundName,
        volume: al.volume,
        snoozeEnabled: al.snoozeEnabled,
        snoozeMinutes: al.snoozeMinutes,
      };
      reminderEngine.trigger(event);
      reminderEngine.sendSystemNotification('Alarm', al.name || 'Alarm');

      // Record trigger
      const rec: AlarmTriggerRecord = {
        alarmId: al.id,
        triggeredAt: now.toISOString(),
        nextRingAt: nextRing.toISOString(),
      };
      db.alarmTriggerRecords.put(rec).then(() => get().loadAlarms());
    }
  },

  // ──── Settings ────
  loadClockSettings: async () => {
    let settings = await db.clockSettings.get(1);
    if (!settings) {
      const defaults = getDefaultClockSettings();
      await db.clockSettings.put({ id: 1, ...defaults });
      settings = await db.clockSettings.get(1);
    }
    set({ clockSettings: settings ?? null });
  },

  updateClockSettings: async (updates) => {
    await db.clockSettings.update(1, { ...updates, updatedAt: new Date().toISOString() });
    await get().loadClockSettings();
  },

  // ──── Reminders ────
  dismissReminder: (eventId) => {
    reminderEngine.dismiss(eventId);
    set((s) => ({ activeReminders: s.activeReminders.filter((r) => r.id !== eventId) }));
  },

  snoozeReminder: (eventId) => {
    const evt = get().activeReminders.find((r) => r.id === eventId);
    if (!evt) return;
    if (window.gtaskerReminders?.nativeNotifications) {
      reminderEngine.dismiss(eventId);
      void window.gtaskerReminders.snooze(evt, evt.snoozeMinutes || 9);
    } else {
      reminderEngine.snooze(eventId, evt.snoozeMinutes || 9);
    }
    set((s) => ({ activeReminders: s.activeReminders.filter((r) => r.id !== eventId) }));
  },

  showReminder: (event) => {
    set((s) => ({
      activeReminders: [...s.activeReminders.filter((r) => r.id !== event.id), event],
    }));
    if (!window.gtaskerReminders?.nativeNotifications) reminderEngine.startAudio(event);
  },

  // ──── Polling ────
  startPolling: () => {
    if (pollIntervalId) return;
    pollIntervalId = setInterval(() => {
      get().tickStopwatch();
      get().tickCountdowns();
      get().checkExpiredCountdowns();
      get().checkAlarms();
    }, 200); // Poll at 200ms for smooth stopwatch display, timer-based accuracy
  },

  stopPolling: () => {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
  },
}));
