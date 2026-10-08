import { execFileSync } from 'node:child_process';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const LABEL_PREFIX = 'com.gtasker.reminder.';
const AGENT_PREFIX = `${LABEL_PREFIX}alarm-`;
const COUNTDOWN_PREFIX = `${LABEL_PREFIX}countdown-`;
const TASK_PREFIX = `${LABEL_PREFIX}task-`;
const DAILY_PREFIX = `${LABEL_PREFIX}daily-`;
const SNOOZE_PREFIX = `${LABEL_PREFIX}snooze-`;

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function plistString(value) {
  return `<string>${xmlEscape(value)}</string>`;
}

function plistInteger(value) {
  return `<integer>${Math.trunc(value)}</integer>`;
}

function plistCalendar(calendar) {
  const entries = Object.entries(calendar)
    .map(([key, value]) => `<key>${key}</key>${plistInteger(value)}`)
    .join('');
  return `<dict>${entries}</dict>`;
}

function plistArray(values) {
  return `<array>${values.map(plistString).join('')}</array>`;
}

function buildPlist({ label, executable, argumentsList, calendar }) {
  const calendars = Array.isArray(calendar) ? calendar : [calendar];
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>${plistString(label)}
  <key>ProgramArguments</key>${plistArray([executable, ...argumentsList])}
  <key>StartCalendarInterval</key>${calendars.length === 1 ? plistCalendar(calendars[0]) : `<array>${calendars.map(plistCalendar).join('')}</array>`}
  <key>ProcessType</key>${plistString('Interactive')}
  <key>RunAtLoad</key><false/>
</dict>
</plist>
`;
}

function localDateParts(date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

function localDateString(date) {
  const parts = localDateParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function timeParts(value) {
  const [hour, minute] = String(value).split(':').map(Number);
  return { hour, minute };
}

function launchdWeekday(day) {
  return day === 0 ? 7 : day;
}

function alarmCalendars(alarm) {
  const { hour, minute } = alarm;
  const rule = alarm.repeatRule;
  if (rule.type === 'daily') return [{ hour, minute }];
  if (rule.type === 'workdays')
    return [1, 2, 3, 4, 5].map((weekday) => ({ hour, minute, weekday }));
  if (rule.type === 'weekends')
    return [0, 6].map((day) => ({ hour, minute, weekday: launchdWeekday(day) }));
  if (rule.type === 'custom') {
    return rule.customDays.map((day) => ({ hour, minute, weekday: launchdWeekday(day) }));
  }
  if (!rule.specificDate) return [];
  const [year, month, day] = rule.specificDate.split('-').map(Number);
  return [{ year, month, day, hour, minute }];
}

function payloadArguments(executable, payload, label) {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  return [
    executable,
    '--reminder-notify',
    '--reminder-payload',
    encoded,
    '--reminder-label',
    label,
  ];
}

function scheduleEntry({ label, executable, payload, calendars }) {
  return {
    label,
    plist: buildPlist({
      label,
      executable,
      argumentsList: payloadArguments(executable, payload, label).slice(1),
      calendar: calendars,
    }),
  };
}

export class MacOSReminderAgents {
  constructor({ executable, userId }) {
    this.executable = executable;
    this.userId = userId;
    this.domain = `gui/${userId}`;
    this.launchAgentsDirectory = join(homedir(), 'Library', 'LaunchAgents');
    this.lastScheduleSignature = null;
  }

  get available() {
    return process.platform === 'darwin' && Boolean(this.userId) && Boolean(this.executable);
  }

  async initialize() {
    if (!this.available) return;
    await mkdir(this.launchAgentsDirectory, { recursive: true });
  }

  async sync(schedule) {
    if (!this.available) return { loaded: 0, failed: 0 };
    await this.initialize();

    const entries = [];
    for (const alarm of schedule.alarms ?? []) {
      if (!alarm.enabled) continue;
      const calendars = alarmCalendars(alarm);
      if (!calendars.length) continue;
      const label = `${AGENT_PREFIX}${alarm.id}`;
      entries.push(
        scheduleEntry({
          label,
          executable: this.executable,
          payload: {
            title: 'G-Tasker 闹钟',
            body: alarm.name || '闹钟',
            source: 'alarm',
            soundName: alarm.soundName,
            volume: alarm.volume,
            validDate: alarm.repeatRule.type === 'once' ? alarm.repeatRule.specificDate : null,
          },
          calendars,
        }),
      );
    }

    for (const countdown of schedule.countdowns ?? []) {
      if (countdown.status !== 'running' || !countdown.expectedEndTimestamp) continue;
      const end = new Date(countdown.expectedEndTimestamp);
      if (Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) continue;
      const label = `${COUNTDOWN_PREFIX}${countdown.id}`;
      entries.push(
        scheduleEntry({
          label,
          executable: this.executable,
          payload: {
            title: 'G-Tasker 倒计时',
            body: `${countdown.name || '倒计时'} 已结束`,
            source: 'countdown',
            soundName: countdown.soundName,
            volume: countdown.volume,
            validDate: localDateString(end),
          },
          calendars: [localDateParts(end)],
        }),
      );
    }

    if (schedule.daily?.notificationEnabled !== false) {
      for (const task of schedule.taskReminders ?? []) {
        const reminderAt = new Date(task.reminderAt);
        if (Number.isNaN(reminderAt.getTime()) || reminderAt.getTime() <= Date.now()) continue;
        const label = `${TASK_PREFIX}${task.id}`;
        entries.push(
          scheduleEntry({
            label,
            executable: this.executable,
            payload: {
              title: 'G-Tasker 任务提醒',
              body: task.title || '有一条任务提醒',
              source: 'task',
              validDate: localDateString(reminderAt),
              soundName: 'soft',
              volume: 0.7,
              soundEnabled: schedule.daily.soundEnabled,
            },
            calendars: [localDateParts(reminderAt)],
          }),
        );
      }
    }

    const daily = schedule.daily;
    if (daily?.notificationEnabled && (daily?.showWhenNoTasks || daily?.hasRelevantTasks)) {
      if (daily.morningEnabled) {
        entries.push(this.dailyEntry('morning', daily.morningTime, daily.weekendEnabled));
      }
      if (daily.eveningEnabled) {
        entries.push(this.dailyEntry('evening', daily.eveningTime, daily.weekendEnabled));
      }
    }

    const scheduleSignature = entries.map((entry) => `${entry.label}\n${entry.plist}`).join('\n');
    if (this.lastScheduleSignature === scheduleSignature) {
      return { loaded: entries.length, failed: 0 };
    }

    await this.removeManagedAgents();

    let loaded = 0;
    let failed = 0;
    for (const entry of entries) {
      try {
        const plistPath = join(this.launchAgentsDirectory, `${entry.label}.plist`);
        await writeFile(plistPath, entry.plist, 'utf8');
        execFileSync('launchctl', ['bootstrap', this.domain, plistPath], { stdio: 'ignore' });
        loaded += 1;
      } catch {
        failed += 1;
      }
    }
    if (failed === 0) this.lastScheduleSignature = scheduleSignature;
    return { loaded, failed };
  }

  dailyEntry(kind, value, weekendEnabled) {
    const { hour, minute } = timeParts(value);
    const calendars = weekendEnabled
      ? [{ hour, minute }]
      : [1, 2, 3, 4, 5].map((weekday) => ({ hour, minute, weekday }));
    const label = `${DAILY_PREFIX}${kind}`;
    return scheduleEntry({
      label,
      executable: this.executable,
      payload: {
        title: kind === 'morning' ? 'G-Tasker 早间提醒' : 'G-Tasker 晚间提醒',
        body: kind === 'morning' ? '查看今天的任务安排' : '检查今天尚未完成的任务',
        source: 'daily',
        dailyKind: kind,
        soundName: 'soft',
        volume: 0.7,
        soundEnabled: daily.soundEnabled,
      },
      calendars,
    });
  }

  async snooze(event, minutes) {
    if (!this.available || !event || event.source !== 'alarm') return;
    const fireAt = new Date(Date.now() + Math.max(1, Number(minutes) || 9) * 60_000);
    const label = `${SNOOZE_PREFIX}${event.sourceId}-${Date.now()}`;
    const entry = scheduleEntry({
      label,
      executable: this.executable,
      payload: {
        title: 'G-Tasker 闹钟',
        body: event.name || '闹钟',
        source: 'alarm',
        soundName: event.soundName,
        volume: event.volume,
        validDate: localDateString(fireAt),
      },
      calendars: [localDateParts(fireAt)],
    });
    const plistPath = join(this.launchAgentsDirectory, `${label}.plist`);
    try {
      await writeFile(plistPath, entry.plist, 'utf8');
      execFileSync('launchctl', ['bootstrap', this.domain, plistPath], { stdio: 'ignore' });
    } catch {
      // Renderer-side snooze remains available when LaunchAgent is unavailable.
    }
  }

  async removeManagedAgents() {
    const labels = new Set();
    let names = [];
    try {
      names = await readdir(this.launchAgentsDirectory);
    } catch {
      names = [];
    }
    for (const name of names) {
      if (!name.endsWith('.plist')) continue;
      const label = name.slice(0, -'.plist'.length);
      if (
        !label.startsWith(AGENT_PREFIX) &&
        !label.startsWith(COUNTDOWN_PREFIX) &&
        !label.startsWith(TASK_PREFIX) &&
        !label.startsWith(DAILY_PREFIX)
      )
        continue;
      labels.add(label);
    }

    try {
      const loadedJobs = execFileSync('launchctl', ['list'], { encoding: 'utf8' });
      for (const line of loadedJobs.split('\n')) {
        const label = line.trim().split(/\s+/).at(-1);
        if (
          label?.startsWith(AGENT_PREFIX) ||
          label?.startsWith(COUNTDOWN_PREFIX) ||
          label?.startsWith(TASK_PREFIX) ||
          label?.startsWith(DAILY_PREFIX)
        ) {
          labels.add(label);
        }
      }
    } catch {}

    for (const label of labels) {
      const plistPath = join(this.launchAgentsDirectory, `${label}.plist`);
      try {
        execFileSync('launchctl', ['bootout', `${this.domain}/${label}`], { stdio: 'ignore' });
      } catch {}
      await rm(plistPath, { force: true }).catch(() => {});
    }
  }
}
