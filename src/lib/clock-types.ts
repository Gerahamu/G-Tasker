// ════ Clock Module Types ════

// ──── World Clock ────
export interface ClockTimezone {
  id?: number;
  timezone: string;       // IANA timezone e.g. "Asia/Shanghai"
  cityName: string;       // Display name e.g. "Shanghai"
  customName: string;     // User-defined alias
  order: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

// ──── Stopwatch ────
export interface StopwatchLap {
  lapNumber: number;
  lapTime: number;        // milliseconds for this lap
  totalTime: number;      // cumulative milliseconds
  timestamp: string;
}

export interface StopwatchState {
  id?: number;            // singleton, always id=1
  isRunning: boolean;
  startTimestamp: number | null;   // Date.now() when started
  accumulatedMs: number;           // total elapsed before current run
  laps: StopwatchLap[];
  lastUpdatedAt: string;
}

// ──── Countdown ────
export type CountdownStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface Countdown {
  id?: number;
  name: string;
  totalSeconds: number;       // configured duration in seconds
  remainingAtPause: number | null;  // seconds remaining when paused (null if not paused)
  startTimestamp: number | null;    // Date.now() when last started
  expectedEndTimestamp: string | null; // ISO timestamp of expected completion
  status: CountdownStatus;
  isLoop: boolean;
  soundEnabled: boolean;
  soundName: string;
  volume: number;             // 0-1
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ──── Alarm ────
export type AlarmRepeatType = 'once' | 'daily' | 'workdays' | 'weekends' | 'custom';

export interface AlarmRepeatRule {
  type: AlarmRepeatType;
  customDays: number[];      // 0-6 (Sun-Sat), only used when type='custom'
  specificDate: string | null; // ISO date "YYYY-MM-DD", only used for 'once'
}

export interface Alarm {
  id?: number;
  name: string;
  hour: number;              // 0-23
  minute: number;            // 0-59
  enabled: boolean;
  repeatRule: AlarmRepeatRule;
  soundName: string;
  volume: number;            // 0-1
  snoozeEnabled: boolean;
  snoozeMinutes: number;     // default 9
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// Track the last triggered time per alarm to avoid re-firing
export interface AlarmTriggerRecord {
  id?: number;
  alarmId: number;
  triggeredAt: string;        // ISO timestamp of last trigger
  nextRingAt: string;         // ISO timestamp of next expected ring
}

// ──── Reminder System ────
export type ReminderSource = 'countdown' | 'alarm';

export interface ReminderEvent {
  id: string;               // unique event id
  source: ReminderSource;
  sourceId: number;         // countdown id or alarm id
  name: string;
  triggeredAt: string;      // ISO timestamp
  soundName: string;
  volume: number;
  snoozeEnabled: boolean;
  snoozeMinutes: number;
}

export interface ActiveReminder {
  event: ReminderEvent;
  audioStarted: boolean;
  dismissed: boolean;
}

// ──── Clock Settings ────
export interface ClockSettings {
  id?: number;              // singleton, always id=1
  timeFormat: '12h' | '24h';
  showSeconds: boolean;
  defaultSound: string;
  defaultVolume: number;    // 0-1
  defaultSnoozeMinutes: number;
  notificationPermission: 'default' | 'granted' | 'denied';
  createdAt: string;
  updatedAt: string;
}

// ──── Time Conversion ────
export interface TimeConversionResult {
  timezone: string;
  cityName: string;
  dateTime: string;         // formatted local datetime
  date: string;
  time: string;
  weekday: string;
  utcOffset: string;
  diffFromLocal: string;    // e.g. "+3h", "-5h"
  dayLabel: 'yesterday' | 'today' | 'tomorrow';
}
