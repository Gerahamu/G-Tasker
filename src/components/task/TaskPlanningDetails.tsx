import type { Task } from '../../lib/types';
import { useT } from '../../lib/i18n';

const COPY = {
  zh: {
    title: '计划信息',
    duration: '预计时长',
    repeat: '重复',
    reminder: '提醒',
    scheduling: '时间安排',
    unfinished: '未完成时',
    locked: '已锁定时间块',
    none: '无',
    minutes: '分钟',
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
    every: '每隔',
    day: '天',
    week: '周',
    month: '月',
    ends: '结束于',
    atStart: '开始时',
    beforeStart: '开始前 {n} 分钟',
    beforeDue: '截止前 {n} 分钟',
    atDue: '截止时',
    fixed: '固定时间',
    suggested: '建议时间',
    anytime: '当天任意时间',
    window: '时间段 {start}–{end}',
    overdue: '保持逾期',
    tomorrow: '顺延到明天',
    nextAvailable: '顺延到下一个可用时段',
    boundary: '重复、自动顺延和任务提醒会按计划执行。',
  },
  en: {
    title: 'Planning details',
    duration: 'Expected duration',
    repeat: 'Repeat',
    reminder: 'Reminder',
    scheduling: 'Time arrangement',
    unfinished: 'When unfinished',
    locked: 'Time block locked',
    none: 'None',
    minutes: 'min',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    every: 'Every',
    day: 'day(s)',
    week: 'week(s)',
    month: 'month(s)',
    ends: 'ends',
    atStart: 'At start',
    beforeStart: '{n} min before start',
    beforeDue: '{n} min before due',
    atDue: 'At due time',
    fixed: 'Fixed time',
    suggested: 'Suggested time',
    anytime: 'Any time today',
    window: 'Window {start}–{end}',
    overdue: 'Keep overdue',
    tomorrow: 'Move to tomorrow',
    nextAvailable: 'Move to next available slot',
    boundary: 'Recurrence, automatic rescheduling, and task reminders follow this plan.',
  },
  ja: {
    title: '予定情報',
    duration: '見込み時間',
    repeat: '繰り返し',
    reminder: 'リマインダー',
    scheduling: '時間の予定',
    unfinished: '未完了の場合',
    locked: '時間枠を固定済み',
    none: 'なし',
    minutes: '分',
    daily: '毎日',
    weekly: '毎週',
    monthly: '毎月',
    every: '間隔',
    day: '日',
    week: '週',
    month: 'か月',
    ends: '終了',
    atStart: '開始時',
    beforeStart: '開始 {n} 分前',
    beforeDue: '期限 {n} 分前',
    atDue: '期限時',
    fixed: '固定時刻',
    suggested: '推奨時刻',
    anytime: '当日中いつでも',
    window: '時間枠 {start}–{end}',
    overdue: '期限切れのまま',
    tomorrow: '明日に繰り越す',
    nextAvailable: '次の空き時間へ繰り越す',
    boundary: '繰り返し、自動繰り越し、タスク通知はこの予定に従って実行されます。',
  },
} as const;

function hasTaskPlanningDetails(task: Task): boolean {
  return Boolean(
    task.durationMinutes ||
    task.repeatRule ||
    task.reminder ||
    (task.timeFlexibility ?? 'anytime') !== 'anytime' ||
    (task.reschedulePolicy ?? 'overdue') !== 'overdue' ||
    task.timeBlockLocked,
  );
}

export function TaskPlanningDetails({ task }: { task: Task }) {
  const { lang } = useT();
  const words = COPY[lang];
  const hasPlanningDetails = hasTaskPlanningDetails(task);

  const repeat = task.repeatRule;
  const repeatText = repeat
    ? repeat.frequency === 'none'
      ? null
      : repeat.frequency === 'custom'
        ? `${words.every} ${repeat.interval ?? 1} ${words[repeat.unit ?? 'day']}`
        : words[repeat.frequency]
    : null;
  const reminderText = task.reminder
    ? task.reminder.anchor === 'due'
      ? task.reminder.minutesBefore === 0
        ? words.atDue
        : words.beforeDue.replace('{n}', String(task.reminder.minutesBefore))
      : task.reminder.minutesBefore === 0
        ? words.atStart
        : words.beforeStart.replace('{n}', String(task.reminder.minutesBefore))
    : null;
  const flexibility = task.timeFlexibility ?? 'anytime';
  const flexibilityText =
    flexibility === 'window'
      ? words.window
          .replace('{start}', task.timeWindowStart ?? '—')
          .replace('{end}', task.timeWindowEnd ?? '—')
      : words[flexibility];
  const reschedule = task.reschedulePolicy ?? 'overdue';

  return (
    <section className="task-detail-planning" data-ui="task-planning-details">
      <h3>{words.title}</h3>
      <dl className="task-detail-planning-grid">
        <div className="task-detail-planning-item">
          <dt>{words.repeat}</dt>
          <dd>
            {repeatText ?? words.none}
            {repeat?.weekdays?.length ? ` · ${repeat.weekdays.join(', ')}` : ''}
            {repeat?.endDate ? ` · ${words.ends} ${repeat.endDate}` : ''}
          </dd>
        </div>
        {task.durationMinutes && (
          <div className="task-detail-planning-item">
            <dt>{words.duration}</dt>
            <dd>
              {task.durationMinutes} {words.minutes}
            </dd>
          </div>
        )}
        {reminderText && (
          <div className="task-detail-planning-item">
            <dt>{words.reminder}</dt>
            <dd>{reminderText}</dd>
          </div>
        )}
        {flexibility !== 'anytime' && (
          <div className="task-detail-planning-item">
            <dt>{words.scheduling}</dt>
            <dd>{flexibilityText}</dd>
          </div>
        )}
        {reschedule !== 'overdue' && (
          <div className="task-detail-planning-item">
            <dt>{words.unfinished}</dt>
            <dd>{words[reschedule === 'next_available' ? 'nextAvailable' : reschedule]}</dd>
          </div>
        )}
        {task.timeBlockLocked && (
          <div className="task-detail-planning-item">
            <dt>{words.scheduling}</dt>
            <dd>{words.locked}</dd>
          </div>
        )}
      </dl>
      {hasPlanningDetails && <p>{words.boundary}</p>}
    </section>
  );
}
