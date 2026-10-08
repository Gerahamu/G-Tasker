import type { AlarmRepeatRule } from './clock-types';

export interface DesktopAlarmSchedule {
  id: number;
  name: string;
  hour: number;
  minute: number;
  enabled: boolean;
  repeatRule: AlarmRepeatRule;
  soundName: string;
  volume: number;
  snoozeEnabled: boolean;
  snoozeMinutes: number;
}

export interface DesktopCountdownSchedule {
  id: number;
  name: string;
  status: 'idle' | 'running' | 'paused' | 'completed';
  expectedEndTimestamp: string | null;
  soundName: string;
  volume: number;
}

export interface DesktopTaskReminderSchedule {
  id: number;
  title: string;
  reminderAt: string;
}

export interface DesktopDailyReminderSchedule {
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
  weekendEnabled: boolean;
  showWhenNoTasks: boolean;
  hasRelevantTasks: boolean;
  notificationEnabled: boolean;
  soundEnabled: boolean;
}

export interface DesktopReminderSchedule {
  version: 1;
  alarms: DesktopAlarmSchedule[];
  countdowns: DesktopCountdownSchedule[];
  taskReminders: DesktopTaskReminderSchedule[];
  daily: DesktopDailyReminderSchedule;
}
