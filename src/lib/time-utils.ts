// ════ Time calculation utilities ════
// Pure functions — no side effects, no DB access

import type { AlarmRepeatRule } from './clock-types';

// ──── Timezone utilities ────

/** Get the user's local IANA timezone */
export function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/** Format a Date in a specific timezone using Intl */
export function formatInTimezone(
  date: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: timezone }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date);
  }
}

/** Get full timezone info for display */
export function getTimezoneInfo(date: Date, timezone: string): {
  time: string;
  date: string;
  weekday: string;
  utcOffset: string;
  timezoneName: string;
} {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: timezone,
    });
    const time = fmt.format(date);

    const dateStr = new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      timeZone: timezone,
    }).format(date);

    const weekdayStr = new Intl.DateTimeFormat('en-US', {
      weekday: 'long', timeZone: timezone,
    }).format(date);

    const offsetParts = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'longOffset', timeZone: timezone,
    }).formatToParts(date);
    const offsetPart = offsetParts.find(p => p.type === 'timeZoneName');
    const utcOffset = offsetPart?.value || 'UTC';

    return { time, date: dateStr, weekday: weekdayStr, utcOffset, timezoneName: timezone };
  } catch {
    return { time: '--:--:--', date: '--', weekday: '--', utcOffset: 'UTC', timezoneName: timezone };
  }
}

/** Get time difference between two timezones as a human-readable string */
export function getTimeDiff(
  date: Date,
  fromTimezone: string,
  toTimezone: string,
): { hours: number; label: string; dayLabel: 'yesterday' | 'today' | 'tomorrow' } {
  try {
    const fromParts = new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false, timeZone: fromTimezone,
    }).format(date);

    const toParts = new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false, timeZone: toTimezone,
    }).format(date);

    // Parse: "MM/DD/YYYY, HH:MM"
    const [fromDateStr, fromTimeStr] = fromParts.split(', ');
    const [toDateStr, toTimeStr] = toParts.split(', ');

    const [fromM, fromD, fromY] = fromDateStr.split('/').map(Number);
    const [fromH, fromMin] = fromTimeStr.split(':').map(Number);
    const [toM, toD, toY] = toDateStr.split('/').map(Number);
    const [toH, toMin] = toTimeStr.split(':').map(Number);

    const fromTotalMin = fromY * 525600 + fromM * 43200 + fromD * 1440 + fromH * 60 + fromMin;
    const toTotalMin = toY * 525600 + toM * 43200 + toD * 1440 + toH * 60 + toMin;

    const diffMin = toTotalMin - fromTotalMin;
    const hours = Math.round(diffMin / 60);

    let dayLabel: 'yesterday' | 'today' | 'tomorrow';
    // Compare calendar dates
    const fromCalendar = fromY * 10000 + fromM * 100 + fromD;
    const toCalendar = toY * 10000 + toM * 100 + toD;
    if (toCalendar < fromCalendar) dayLabel = 'yesterday';
    else if (toCalendar > fromCalendar) dayLabel = 'tomorrow';
    else dayLabel = 'today';

    const absHours = Math.abs(hours);
    const label = hours === 0 ? '0h' : hours > 0 ? `+${absHours}h` : `-${absHours}h`;

    return { hours, label, dayLabel };
  } catch {
    return { hours: 0, label: '0h', dayLabel: 'today' };
  }
}

/** Convert time from one timezone to another for a given date+time */
export function convertTime(
  sourceDate: string,    // "YYYY-MM-DD"
  sourceTime: string,    // "HH:mm"
  sourceTimezone: string,
  targetTimezone: string,
): { date: string; time: string; weekday: string } {
  const [year, month, day] = sourceDate.split('-').map(Number);
  const [hour, minute] = sourceTime.split(':').map(Number);

  try {
    // Step 1: Get the UTC offset of source timezone at the approximate time
    const approxUtc = Date.UTC(year, month - 1, day, hour, minute);
    const sourceOffsetMs = getTzOffsetMs(sourceTimezone, approxUtc);

    // Step 2: The actual UTC instant = wall clock - source offset
    const utcMs = approxUtc - sourceOffsetMs;

    // Step 3: Format in target timezone
    const targetFmt = new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false, timeZone: targetTimezone,
    });
    const targetStr = targetFmt.format(utcMs);
    const [tDate, tTime] = targetStr.split(', ');

    const weekdayStr = new Intl.DateTimeFormat('en-US', {
      weekday: 'long', timeZone: targetTimezone,
    }).format(utcMs);

    return { date: tDate, time: tTime, weekday: weekdayStr };
  } catch {
    return { date: sourceDate, time: sourceTime, weekday: '-' };
  }
}

/** Get timezone offset in milliseconds at a given UTC timestamp */
function getTzOffsetMs(tz: string, utcTimestamp: number): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, timeZoneName: 'longOffset',
    }).formatToParts(utcTimestamp);
    const offsetStr = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT';
    const match = offsetStr.match(/GMT([+-]\d{1,2}):?(\d{2})?/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2] || '0', 10);
      return (hours * 60 + minutes) * 60 * 1000;
    }
    return 0;
  } catch {
    return 0;
  }
}

// ──── Stopwatch utilities ────

/** Calculate elapsed milliseconds from stopwatch state */
export function calcElapsedMs(
  startTimestamp: number | null,
  accumulatedMs: number,
  isRunning: boolean,
): number {
  if (!isRunning || !startTimestamp) return accumulatedMs;
  return accumulatedMs + (Date.now() - startTimestamp);
}

/** Format milliseconds as HH:MM:SS.cc */
export function formatStopwatch(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const cc = String(centiseconds).padStart(2, '0');

  if (hours > 0) return `${hh}:${mm}:${ss}.${cc}`;
  return `${mm}:${ss}.${cc}`;
}

// ──── Countdown utilities ────

/** Calculate remaining seconds for a countdown */
export function calcRemainingSeconds(
  status: string,
  startTimestamp: number | null,
  remainingAtPause: number | null,
  totalSeconds: number,
): number {
  if (status === 'idle') return totalSeconds;
  if (status === 'completed') return 0;
  if (status === 'paused') return remainingAtPause ?? totalSeconds;
  if (status === 'running' && startTimestamp && remainingAtPause !== null) {
    const elapsed = (Date.now() - startTimestamp) / 1000;
    return Math.max(0, remainingAtPause - elapsed);
  }
  return totalSeconds;
}

/** Format seconds as HH:MM:SS */
export function formatCountdown(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ──── Alarm utilities ────

/** Calculate the next ring time for an alarm */
export function calcNextRingTime(hour: number, minute: number, rule: AlarmRepeatRule): Date | null {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(hour, minute, 0, 0);

  if (rule.type === 'once') {
    if (rule.specificDate) {
      const specDate = new Date(rule.specificDate + `T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
      return specDate > now ? specDate : null;
    }
    // If no specific date, treat as today
    if (candidate > now) return candidate;
    candidate.setDate(candidate.getDate() + 1);
    return candidate;
  }

  if (rule.type === 'daily') {
    if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
    return candidate;
  }

  if (rule.type === 'workdays') {
    // Mon-Fri (1-5, where 0=Sun)
    while (candidate <= now || candidate.getDay() === 0 || candidate.getDay() === 6) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  if (rule.type === 'weekends') {
    // Sat-Sun (0 and 6)
    while (candidate <= now || (candidate.getDay() !== 0 && candidate.getDay() !== 6)) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  if (rule.type === 'custom' && rule.customDays.length > 0) {
    let safety = 0;
    while (safety < 366) {
      if (candidate > now && rule.customDays.includes(candidate.getDay())) {
        return candidate;
      }
      candidate.setDate(candidate.getDate() + 1);
      safety++;
    }
    return null;
  }

  return null;
}

/** Format "next ring" as a human-readable string */
export function formatNextRingTime(date: Date | null, t: (key: string) => string): string {
  if (!date) return '—';
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs < 0) return t('expired');

  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);

  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

  // Today
  if (date.toDateString() === now.toDateString()) {
    if (diffHr > 0) return `${t('today')} ${timeStr} · ${t('in')} ${diffHr}${t('h')} ${diffMin % 60}${t('min')}`;
    return `${t('today')} ${timeStr} · ${t('in')} ${diffMin}${t('min')}`;
  }

  // Tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) {
    return `${t('tomorrow')} ${timeStr}`;
  }

  // This week
  const weekdays = ['sunday2', 'monday2', 'tuesday2', 'wednesday2', 'thursday2', 'friday2', 'saturday2'];
  const diffDays = Math.ceil(diffMs / 86400000);
  if (diffDays <= 7) {
    return `${t(weekdays[date.getDay()])} ${timeStr}`;
  }

  // Further out
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day} ${timeStr}`;
}

// ──── Browser tab visibility ────

export function getBrowserTabId(): string {
  let tabId = sessionStorage.getItem('clock-tab-id');
  if (!tabId) {
    tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem('clock-tab-id', tabId);
  }
  return tabId;
}

// ──── Notification permission ────

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}
