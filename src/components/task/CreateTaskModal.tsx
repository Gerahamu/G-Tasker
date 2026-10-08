import { useState, useEffect, useMemo, useRef, type SetStateAction } from 'react';
import { useTaskStore } from '../../stores/task-store';
import { useListStore } from '../../stores/list-store';
import { useUIStore } from '../../stores/ui-store';
import { getListDisplayName, useT } from '../../lib/i18n';
import type {
  Priority,
  RepeatFrequency,
  RepeatUnit,
  ReschedulePolicy,
  TaskDraft,
  TimeFlexibility,
} from '../../lib/types';
import { todayISO } from '../../lib/format-date';
import {
  X,
  Clock,
  Clock3,
  Gauge,
  CalendarClock,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  CalendarDays,
  ListTodo,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { DateTimePicker } from '../ui/DateTimePicker';
import { TaskDateValidationError } from '../../lib/task-dates';
import { FloatingLayer } from '../ui/FloatingLayer';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  captureTaskFormSnapshot,
  createDefaultTaskFormState,
  hydrateTaskFormSnapshot,
  type CreateTaskFormState,
  TaskFormValidationError,
} from '../../lib/task-draft';
import {
  getTaskDraft,
  deleteTaskDraft,
  listTaskDrafts,
  migrateLegacyTaskDrafts,
  saveTaskDraft,
} from '../../db/task-drafts';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
}

const MORE_SETTINGS_COPY = {
  zh: {
    moreSettings: '更多设置',
    timeSettings: '时间设置',
    preciseTime: '精确时间',
    duration: '持续时间',
    minutes: '分钟',
    repeat: '重复',
    noRepeat: '不重复',
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
    custom: '自定义',
    every: '每隔',
    day: '天',
    week: '周',
    month: '月',
    repeatEnd: '重复结束日期',
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    reminder: '提醒',
    none: '不提醒',
    atStart: '开始时提醒',
    before: '开始前 {n} 分钟',
    beforeDue: '截止前 {n} 分钟',
    atDue: '截止时提醒',
    customReminder: '自定义提醒',
    priorityNormal: '普通',
    priorityImportant: '重要',
    priorityUrgent: '紧急',
    taskScheduling: '任务调度',
    scheduling: '时间安排',
    fixed: '固定时间',
    suggested: '建议时间',
    anytime: '当天任意时间',
    window: '指定时间段内完成',
    windowStart: '窗口开始',
    windowEnd: '窗口结束',
    expectedDuration: '预计需要',
    unfinished: '任务未完成时',
    overdue: '保持逾期',
    tomorrow: '顺延到明天',
    nextAvailable: '顺延到下一个可用时段',
    lockBlock: '锁定此时间段',
    lockBlockHint: '保留为固定时间块',
    draftCollection: '草稿集',
    draftCollectionEmpty: '还没有已保存的任务草稿',
    draftCollectionLoading: '正在读取草稿…',
    deleteDraft: '删除草稿',
    deleteDraftConfirm: '删除草稿“{title}”？此操作无法撤销。',
    draftDeleted: '草稿已删除',
  },
  en: {
    moreSettings: 'More settings',
    timeSettings: 'Time settings',
    preciseTime: 'Precise time',
    duration: 'Duration',
    minutes: 'min',
    repeat: 'Repeat',
    noRepeat: 'Does not repeat',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    custom: 'Custom',
    every: 'Every',
    day: 'day(s)',
    week: 'week(s)',
    month: 'month(s)',
    repeatEnd: 'Ends on',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    reminder: 'Reminder',
    none: 'No reminder',
    atStart: 'At start',
    before: '{n} min before start',
    beforeDue: '{n} min before due',
    atDue: 'At due time',
    customReminder: 'Custom reminder',
    priorityNormal: 'Normal',
    priorityImportant: 'Important',
    priorityUrgent: 'Urgent',
    taskScheduling: 'Task scheduling',
    scheduling: 'Time arrangement',
    fixed: 'Fixed time',
    suggested: 'Suggested time',
    anytime: 'Any time today',
    window: 'Complete within a window',
    windowStart: 'Window starts',
    windowEnd: 'Window ends',
    expectedDuration: 'Expected duration',
    unfinished: 'When unfinished',
    overdue: 'Keep overdue',
    tomorrow: 'Move to tomorrow',
    nextAvailable: 'Move to next available slot',
    lockBlock: 'Lock this time block',
    lockBlockHint: 'Reserve as a fixed block',
    draftCollection: 'Drafts',
    draftCollectionEmpty: 'No saved task drafts yet',
    draftCollectionLoading: 'Loading drafts…',
    deleteDraft: 'Delete draft',
    deleteDraftConfirm: 'Delete the draft “{title}”? This cannot be undone.',
    draftDeleted: 'Draft deleted',
  },
  ja: {
    moreSettings: 'その他の設定',
    timeSettings: '時間設定',
    preciseTime: '開始・終了時刻',
    duration: '所要時間',
    minutes: '分',
    repeat: '繰り返し',
    noRepeat: '繰り返さない',
    daily: '毎日',
    weekly: '毎週',
    monthly: '毎月',
    custom: 'カスタム',
    every: '間隔',
    day: '日',
    week: '週',
    month: 'か月',
    repeatEnd: '終了日',
    weekdays: ['日', '月', '火', '水', '木', '金', '土'],
    reminder: 'リマインダー',
    none: 'リマインダーなし',
    atStart: '開始時',
    before: '開始 {n} 分前',
    beforeDue: '期限 {n} 分前',
    atDue: '期限時',
    customReminder: 'カスタム',
    priorityNormal: '通常',
    priorityImportant: '重要',
    priorityUrgent: '緊急',
    taskScheduling: 'タスク調整',
    scheduling: '時間の予定',
    fixed: '固定時刻',
    suggested: '推奨時刻',
    anytime: '当日中いつでも',
    window: '時間枠内に完了',
    windowStart: '開始時刻',
    windowEnd: '終了時刻',
    expectedDuration: '見込み時間',
    unfinished: '未完了の場合',
    overdue: '期限切れのまま',
    tomorrow: '明日に繰り越す',
    nextAvailable: '次の空き時間へ繰り越す',
    lockBlock: 'この時間帯を固定',
    lockBlockHint: '固定の時間ブロックとして確保',
    draftCollection: '下書き一覧',
    draftCollectionEmpty: '保存済みの下書きはありません',
    draftCollectionLoading: '下書きを読み込み中…',
    deleteDraft: '下書きを削除',
    deleteDraftConfirm: '下書き「{title}」を削除しますか？この操作は元に戻せません。',
    draftDeleted: '下書きを削除しました',
  },
} as const;

const toLocalDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const QUICK_DATE_COPY = {
  zh: { nextWeek: '下周', addSubtask: '添加子任务' },
  en: { nextWeek: 'Next week', addSubtask: 'Add subtask' },
  ja: { nextWeek: '来週', addSubtask: 'サブタスクを追加' },
} as const;

const START_REMINDER_MODES = new Set<CreateTaskFormState['reminderMode']>([
  'start',
  '5',
  '10',
  '30',
  'custom',
]);

function resolveStateAction<T>(value: SetStateAction<T>, current: T): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(current) : value;
}

function deriveScheduledEnd(form: CreateTaskFormState): CreateTaskFormState {
  if (!form.showPreciseTime || !form.dateStart || !form.dateStartTime || !form.durationMinutes) {
    return form;
  }
  const startsAt = new Date(`${form.dateStart}T${form.dateStartTime}`);
  if (Number.isNaN(startsAt.getTime())) return form;
  const endsAt = new Date(startsAt.getTime() + form.durationMinutes * 60_000);
  return {
    ...form,
    dueDate: toLocalDate(endsAt),
    dueTime: `${String(endsAt.getHours()).padStart(2, '0')}:${String(endsAt.getMinutes()).padStart(2, '0')}`,
  };
}

function SettingSelect<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((option) => option.value === value)?.label ?? '';
  return (
    <div className="create-task-setting-menu" data-open={open ? 'true' : 'false'}>
      <button
        ref={triggerRef}
        type="button"
        className="create-task-setting-select"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((shown) => !shown)}
        onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
      >
        <span>{selected}</span>
        <ChevronDown size={14} />
      </button>
      <FloatingLayer
        open={open}
        anchorRef={triggerRef}
        onClose={() => setOpen(false)}
        className="create-task-setting-options"
        role="listbox"
        ariaLabel={label}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={option.value === value}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
          >
            {option.label}
          </button>
        ))}
      </FloatingLayer>
    </div>
  );
}

export function CreateTaskModal({ open, onClose }: CreateTaskModalProps) {
  const { t, lang } = useT();
  const words = MORE_SETTINGS_COPY[lang];
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const addTask = useTaskStore((s) => s.addTask);
  const addToast = useUIStore((s) => s.addToast);
  const presetListId = useUIStore((s) => s.presetListId);
  const createTaskRequest = useUIStore((s) => s.createTaskRequest);
  const allLists = useListStore((s) => s.lists);
  const loadLists = useListStore((s) => s.loadLists);
  const userLists = useMemo(() => allLists.filter((l) => !l.isSmartList), [allLists]);
  const addList = useListStore((s) => s.addList);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const titleCompositionRef = useRef(false);
  const isComposingRef = useRef(false);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    const dup = userLists.find((l) => l.name === newListName.trim());
    if (dup) {
      setListId(dup.id!);
    } else {
      const id = await addList({
        name: newListName.trim(),
        color: '#3b82f6',
        icon: 'List',
        isSmartList: false,
        filterConfig: null,
      });
      setListId(id as number);
    }
    setNewListName('');
    setShowNewList(false);
  };

  // ✅ 读取设置中的默认值
  const defaultDue = (() => {
    try {
      return JSON.parse(localStorage.getItem('task-default-due') || 'false');
    } catch {
      return false;
    }
  })();
  const defaultReminderMinutes = (() => {
    try {
      const enabled = JSON.parse(localStorage.getItem('notify-enabled') || 'true');
      const minutes = Number(JSON.parse(localStorage.getItem('notify-reminder') || '15'));
      return enabled && Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : null;
    } catch {
      return null;
    }
  })();
  const todayStr = todayISO();
  const quickDateWords = QUICK_DATE_COPY[lang];
  const tomorrowStr = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return toLocalDate(date);
  }, []);
  const nextWeekStr = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return toLocalDate(date);
  }, []);

  // ── Unified form state: defaults and hydrated drafts replace one complete value. ──
  const [form, setForm] = useState<CreateTaskFormState>(() => ({
    ...createDefaultTaskFormState({
      listId: 0,
      dueDate: createTaskRequest?.initialDate || (defaultDue ? todayStr : ''),
      defaultReminderMinutes,
    }),
    title: createTaskRequest?.initialTitle ?? '',
    dateStart: createTaskRequest?.initialDate || '',
  }));
  const reminderTouchedRef = useRef(false);
  const setFormField = <K extends keyof CreateTaskFormState>(
    field: K,
    value: SetStateAction<CreateTaskFormState[K]>,
  ) => {
    setForm((current) => {
      const next = {
        ...current,
        [field]:
          typeof value === 'function'
            ? (value as (previous: CreateTaskFormState[K]) => CreateTaskFormState[K])(
                current[field],
              )
            : value,
      };
      return field === 'showPreciseTime' ||
        field === 'dateStart' ||
        field === 'dateStartTime' ||
        field === 'durationMinutes'
        ? deriveScheduledEnd(next)
        : next;
    });
  };
  const {
    title,
    priority,
    listId,
    notes,
    dueDate,
    dueTime,
    showMoreSettings,
    showPreciseTime,
    dateStart,
    dateStartTime,
    showDueTime,
    durationMinutes,
    repeatFrequency,
    repeatInterval,
    repeatUnit,
    repeatWeekdays,
    repeatEndDate,
    reminderMode,
    customReminderMinutes,
    timeFlexibility,
    timeWindowStart,
    timeWindowEnd,
    reschedulePolicy,
    timeBlockLocked,
    showSubtasks,
    subtaskTitles: draftSubtasks,
  } = form;
  const setTitle = (value: SetStateAction<string>) => setFormField('title', value);
  const setPriority = (value: SetStateAction<Priority>) => setFormField('priority', value);
  const setListId = (value: SetStateAction<number>) => setFormField('listId', value);
  const setNotes = (value: SetStateAction<string>) => setFormField('notes', value);
  const setDueDate = (value: SetStateAction<string>) =>
    setForm((current) => {
      const dueDate = resolveStateAction(value, current.dueDate);
      const clearDueReminder =
        !dueDate && (current.reminderMode === 'due' || current.reminderMode === 'due_before');
      const applyDefaultReminder =
        dueDate &&
        current.reminderMode === 'none' &&
        !reminderTouchedRef.current &&
        defaultReminderMinutes;
      return {
        ...current,
        dueDate,
        dueTime: dueDate ? current.dueTime : '',
        reminderMode: clearDueReminder
          ? 'none'
          : applyDefaultReminder
            ? 'due_before'
            : current.reminderMode,
        customReminderMinutes: applyDefaultReminder
          ? defaultReminderMinutes
          : clearDueReminder
            ? ''
            : current.customReminderMinutes,
      };
    });
  const setDueTime = (value: SetStateAction<string>) => setFormField('dueTime', value);
  const setShowMoreSettings = (value: SetStateAction<boolean>) =>
    setFormField('showMoreSettings', value);
  const setShowPreciseTime = (value: SetStateAction<boolean>) =>
    setForm((current) => {
      const showPreciseTime = resolveStateAction(value, current.showPreciseTime);
      if (showPreciseTime) return deriveScheduledEnd({ ...current, showPreciseTime: true });
      const clearStartReminder = START_REMINDER_MODES.has(current.reminderMode);
      return {
        ...current,
        showPreciseTime: false,
        showDueTime: Boolean(current.dueTime),
        dateStart: '',
        dateStartTime: '',
        durationMinutes: current.timeFlexibility === 'window' ? current.durationMinutes : '',
        timeBlockLocked: false,
        reminderMode: clearStartReminder ? 'none' : current.reminderMode,
        customReminderMinutes: clearStartReminder ? '' : current.customReminderMinutes,
      };
    });
  const setDateStart = (value: SetStateAction<string>) =>
    setForm((current) => {
      const next = deriveScheduledEnd({
        ...current,
        dateStart: resolveStateAction(value, current.dateStart),
      });
      if (next.dateStart && next.dateStartTime) return next;
      return START_REMINDER_MODES.has(next.reminderMode)
        ? { ...next, reminderMode: 'none', customReminderMinutes: '' }
        : next;
    });
  const setDateStartTime = (value: SetStateAction<string>) =>
    setForm((current) => {
      const next = deriveScheduledEnd({
        ...current,
        dateStartTime: resolveStateAction(value, current.dateStartTime),
      });
      if (next.dateStart && next.dateStartTime) return next;
      return START_REMINDER_MODES.has(next.reminderMode)
        ? { ...next, reminderMode: 'none', customReminderMinutes: '' }
        : next;
    });
  // Both date modes edit the same deadline; changing the view must not erase it.
  const dateEnd = dueDate;
  const setDateEnd = setDueDate;
  const dateEndTime = dueTime;
  const setDateEndTime = setDueTime;
  const setShowDueTime = (value: SetStateAction<boolean>) =>
    setForm((current) => {
      const showDueTime = resolveStateAction(value, current.showDueTime);
      return { ...current, showDueTime, dueTime: showDueTime ? current.dueTime : '' };
    });
  const setDurationMinutes = (value: SetStateAction<number | ''>) =>
    setFormField('durationMinutes', value);
  const setRepeatFrequency = (value: SetStateAction<RepeatFrequency>) =>
    setForm((current) => {
      const repeatFrequency = resolveStateAction(value, current.repeatFrequency);
      return repeatFrequency === 'none'
        ? {
            ...current,
            repeatFrequency,
            repeatInterval: 1,
            repeatUnit: 'week',
            repeatWeekdays: [],
            repeatEndDate: '',
          }
        : { ...current, repeatFrequency };
    });
  const setRepeatInterval = (value: SetStateAction<number>) =>
    setFormField('repeatInterval', value);
  const setRepeatUnit = (value: SetStateAction<RepeatUnit>) =>
    setForm((current) => {
      const repeatUnit = resolveStateAction(value, current.repeatUnit);
      return {
        ...current,
        repeatUnit,
        repeatWeekdays: repeatUnit === 'week' ? current.repeatWeekdays : [],
      };
    });
  const setRepeatWeekdays = (value: SetStateAction<number[]>) =>
    setFormField('repeatWeekdays', value);
  const setRepeatEndDate = (value: SetStateAction<string>) => setFormField('repeatEndDate', value);
  const setReminderMode = (value: SetStateAction<CreateTaskFormState['reminderMode']>) =>
    setForm((current) => {
      const reminderMode = resolveStateAction(value, current.reminderMode);
      reminderTouchedRef.current = true;
      return {
        ...current,
        reminderMode,
        customReminderMinutes:
          reminderMode === 'custom' || reminderMode === 'due_before'
            ? current.customReminderMinutes || defaultReminderMinutes || ''
            : '',
      };
    });
  const setCustomReminderMinutes = (value: SetStateAction<number | ''>) =>
    setFormField('customReminderMinutes', value);
  const setTimeFlexibility = (value: SetStateAction<TimeFlexibility>) =>
    setForm((current) => {
      const timeFlexibility = resolveStateAction(value, current.timeFlexibility);
      return timeFlexibility === 'window'
        ? { ...current, timeFlexibility }
        : {
            ...current,
            timeFlexibility,
            timeWindowStart: '',
            timeWindowEnd: '',
            durationMinutes: current.showPreciseTime ? current.durationMinutes : '',
          };
    });
  const setTimeWindowStart = (value: SetStateAction<string>) =>
    setFormField('timeWindowStart', value);
  const setTimeWindowEnd = (value: SetStateAction<string>) => setFormField('timeWindowEnd', value);
  const setReschedulePolicy = (value: SetStateAction<ReschedulePolicy>) =>
    setFormField('reschedulePolicy', value);
  const setTimeBlockLocked = (value: SetStateAction<boolean>) =>
    setFormField('timeBlockLocked', value);
  const setShowSubtasks = (value: SetStateAction<boolean>) => setFormField('showSubtasks', value);
  const setDraftSubtasks = (value: SetStateAction<string[]>) =>
    setFormField('subtaskTitles', value);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const subtaskCompositionRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftCollection, setShowDraftCollection] = useState(false);
  const [drafts, setDrafts] = useState<TaskDraft[]>([]);
  const [isDraftCollectionLoading, setIsDraftCollectionLoading] = useState(true);
  const [loadingDraftId, setLoadingDraftId] = useState<number | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<TaskDraft | null>(null);
  const draftCollectionRequestRef = useRef(0);
  const draftSelectionRequestRef = useRef(0);

  useEffect(() => {
    void loadLists().then(() => {
      const lists = useListStore.getState().lists.filter((list) => !list.isSmartList);
      setForm((current) =>
        current.listId ? current : { ...current, listId: presetListId || lists[0]?.id || 0 },
      );
    });
  }, [loadLists, presetListId]);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const picker = document.querySelector<HTMLElement>('.gt-picker-panel:popover-open');
        if (picker) {
          event.preventDefault();
          picker.hidePopover();
          document.querySelector<HTMLElement>(`[aria-controls="${picker.id}"]`)?.focus();
          return;
        }
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const captured = openerRef.current;
      const fallback = document.querySelector<HTMLElement>('[data-ui="create-task-trigger"]');
      queueMicrotask(() => (captured?.closest('[data-ui="modal"]') ? fallback : captured)?.focus());
    };
  }, [open]);
  useEffect(() => {
    const requestId = ++draftCollectionRequestRef.current;
    ++draftSelectionRequestRef.current;
    let cancelled = false;
    if (!open) return;
    void (async () => {
      try {
        await migrateLegacyTaskDrafts();
        const savedDrafts = await listTaskDrafts();
        if (!cancelled && requestId === draftCollectionRequestRef.current) {
          setDrafts(savedDrafts);
        }
      } catch {
        if (!cancelled && requestId === draftCollectionRequestRef.current) {
          setDrafts([]);
          addToast(t('operationFailed'), 'error');
        }
      } finally {
        if (!cancelled && requestId === draftCollectionRequestRef.current) {
          setIsDraftCollectionLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addToast, open, t]);

  const hasTitle = title.trim().length > 0;

  const addDraftSubtask = () => {
    const subtaskTitle = newSubtaskTitle.trim();
    if (!subtaskTitle) return;
    setDraftSubtasks((subtasks) => [...subtasks, subtaskTitle]);
    setNewSubtaskTitle('');
  };

  const handleDraftSubtaskKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    const nativeComposing = (event.nativeEvent as { isComposing?: boolean }).isComposing;
    if (nativeComposing || subtaskCompositionRef.current) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    addDraftSubtask();
  };

  const handleCloseWithDraft = async () => {
    if (submitInFlightRef.current) return;
    if (hasTitle || form.subtaskTitles.some((s) => s.trim() !== '') || form.notes.trim() !== '') {
      try {
        const snapshot = captureTaskFormSnapshot(form, userLists[0]?.id ?? 0);
        await saveTaskDraft(snapshot);
      } catch (e) {
        console.error(e);
      }
    }
    onClose();
  };

  useEffect(() => {
    onCloseRef.current = handleCloseWithDraft;
  }); // run on every render

  const handleSave = async (status: 'active' | 'draft') => {
    if (submitInFlightRef.current) return;
    if (!hasTitle) {
      addToast(t('enterTitle'), 'error');
      return;
    }
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    try {
      const snapshot = captureTaskFormSnapshot(form, userLists[0]?.id ?? 0);
      if (status === 'draft') {
        await saveTaskDraft(snapshot);
      } else {
        await addTask(
          { ...snapshot.task, status: 'active' },
          { subtaskTitles: snapshot.subtaskTitles },
        );
        await createTaskRequest?.onCreated?.();
      }
      const name = snapshot.task.title;
      addToast(
        status === 'draft'
          ? t('draftSavedToast', { title: name })
          : t('taskCreatedToast', { title: name }),
        'success',
      );
      onClose();
    } catch (error) {
      addToast(
        error instanceof TaskDateValidationError
          ? t('invalidDateRange')
          : error instanceof TaskFormValidationError
            ? t('invalidTaskSettings')
            : t('operationFailed'),
        'error',
      );
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleLoadDraft = async (draftId: number) => {
    const requestId = ++draftSelectionRequestRef.current;
    setLoadingDraftId(draftId);
    try {
      const [draft] = await Promise.all([getTaskDraft(draftId), loadLists()]);
      if (requestId !== draftSelectionRequestRef.current || !draft) return;
      reminderTouchedRef.current = true;
      const hydrated = hydrateTaskFormSnapshot(draft.snapshot);
      const currentLists = useListStore.getState().lists.filter((list) => !list.isSmartList);
      const fallbackListId = presetListId || currentLists[0]?.id || 0;
      const availableListId = currentLists.some((list) => list.id === hydrated.listId)
        ? hydrated.listId
        : fallbackListId;
      setForm({
        ...hydrated,
        listId: availableListId,
      });
      setNewSubtaskTitle('');
      setShowNewList(false);
      setNewListName('');
      setShowDraftCollection(false);
    } catch {
      if (requestId === draftSelectionRequestRef.current) addToast(t('operationFailed'), 'error');
    } finally {
      if (requestId === draftSelectionRequestRef.current) setLoadingDraftId(null);
    }
  };

  const handleDeleteDraft = async () => {
    if (draftToDelete?.id === undefined) return;
    try {
      ++draftSelectionRequestRef.current;
      await deleteTaskDraft(draftToDelete.id);
      setDrafts((current) => current.filter((draft) => draft.id !== draftToDelete.id));
      setLoadingDraftId((current) => (current === draftToDelete.id ? null : current));
      setDraftToDelete(null);
      addToast(words.draftDeleted, 'success');
    } catch {
      addToast(t('operationFailed'), 'error');
    }
  };

  const draftDateFormatter = new Intl.DateTimeFormat(
    lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US',
    { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  );

  if (!open) return null;

  return (
    <div
      className={`modal-backdrop modal-backdrop-scroll create-task-backdrop ${
        showMoreSettings ? 'create-task-backdrop--expanded' : 'create-task-backdrop--collapsed'
      } animate-fade-in`}
      onClick={handleCloseWithDraft}
    >
      <div
        className="modal-panel create-task-modal gt-modal max-w-lg my-6 animate-modal-in"
        data-ui="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
      >
        <div className="modal-header create-task-header">
          <h2 id="create-task-title" className="create-task-header-title">
            {t('newTask')}
          </h2>
          <div className="create-task-header-actions">
            <button
              type="button"
              className={`create-task-drafts-trigger ${showDraftCollection ? 'is-active' : ''}`}
              aria-label={words.draftCollection}
              aria-expanded={showDraftCollection}
              onClick={() => setShowDraftCollection((shown) => !shown)}
            >
              <span>{words.draftCollection}</span>
              {drafts.length > 0 && <span aria-hidden="true">{drafts.length}</span>}
            </button>
            {!showDraftCollection && (
              <button
                type="button"
                onClick={() => setShowMoreSettings((value) => !value)}
                className={`create-task-more-trigger gt-button-icon ${
                  showMoreSettings ? 'is-active' : ''
                }`}
                aria-label={words.moreSettings}
                title={words.moreSettings}
              >
                <Settings size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={handleCloseWithDraft}
              className="create-task-close gt-button-icon"
              aria-label={t('closeDialog')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {showDraftCollection ? (
          <div className="create-task-drafts-view" aria-live="polite">
            {isDraftCollectionLoading ? (
              <p className="create-task-drafts-empty">{words.draftCollectionLoading}</p>
            ) : drafts.length === 0 ? (
              <p className="create-task-drafts-empty">{words.draftCollectionEmpty}</p>
            ) : (
              <div className="create-task-drafts-list">
                {drafts.map((draft) => (
                  <div key={draft.id} className="create-task-draft-item">
                    <button
                      type="button"
                      className="create-task-draft-row"
                      aria-busy={loadingDraftId === draft.id}
                      onClick={() => draft.id !== undefined && handleLoadDraft(draft.id)}
                    >
                      <span className="create-task-draft-row-title">{draft.title}</span>
                      <span className="create-task-draft-row-meta">
                        {draft.snapshot.task.dueDate && <span>{draft.snapshot.task.dueDate}</span>}
                        <time dateTime={draft.updatedAt}>
                          {draftDateFormatter.format(new Date(draft.updatedAt))}
                        </time>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="create-task-draft-delete"
                      aria-label={`${words.deleteDraft}：${draft.title}`}
                      title={words.deleteDraft}
                      onClick={() => setDraftToDelete(draft)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="create-task-body">
              <section className="create-task-title-zone">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onCompositionStart={() => {
                    titleCompositionRef.current = true;
                  }}
                  onCompositionEnd={() => {
                    titleCompositionRef.current = false;
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    const nativeComposing = (event.nativeEvent as { isComposing?: boolean })
                      .isComposing;
                    if (nativeComposing || titleCompositionRef.current) return;
                    event.preventDefault();
                    void handleSave('active');
                  }}
                  placeholder={t('taskTitle3')}
                  className="gt-field create-task-title-input"
                  autoFocus
                />
              </section>

              {!showPreciseTime && (
                <section className="create-task-properties-island" aria-label={t('dueDate')}>
                  <div className="create-task-property-heading">
                    <CalendarDays size={16} />
                    <span>{t('dueDate')}</span>
                    <div className="create-task-quick-dates" aria-label={t('dueDate')}>
                      <button type="button" onClick={() => setDueDate(todayStr)}>
                        {t('today')}
                      </button>
                      <button type="button" onClick={() => setDueDate(tomorrowStr)}>
                        {t('tomorrow')}
                      </button>
                      <button type="button" onClick={() => setDueDate(nextWeekStr)}>
                        {quickDateWords.nextWeek}
                      </button>
                    </div>
                  </div>
                  <div className="create-task-property-controls">
                    <DateTimePicker
                      type="date"
                      value={dueDate}
                      onChange={setDueDate}
                      aria-label={t('dueDate')}
                      className="gt-field create-task-date-field"
                    />
                    <div
                      className={`create-task-time-field ${showDueTime || dueTime ? 'is-active' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => setShowDueTime(!showDueTime)}
                        title={showDueTime ? t('hideTime') : t('showTime')}
                        aria-label={showDueTime ? t('hideTime') : t('showTime')}
                      >
                        <Clock size={16} />
                        <span>{t('dueTime')}</span>
                      </button>
                      {showDueTime && (
                        <DateTimePicker
                          type="time"
                          value={dueTime}
                          onChange={setDueTime}
                          aria-label={t('dueTime')}
                          className="gt-field create-task-time-picker animate-slide-right"
                        />
                      )}
                    </div>
                  </div>
                </section>
              )}

              <div className="create-task-ownership">
                <div
                  className={
                    showNewList ? 'create-task-list-field is-creating' : 'create-task-list-field'
                  }
                >
                  <label>
                    <ListTodo size={15} /> {t('taskList')}
                  </label>
                  {showNewList ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        onCompositionStart={() => {
                          isComposingRef.current = true;
                        }}
                        onCompositionEnd={() => {
                          isComposingRef.current = false;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (
                              (e.nativeEvent as { isComposing?: boolean }).isComposing ||
                              isComposingRef.current
                            )
                              return;
                            handleCreateList();
                          }
                          if (e.key === 'Escape') {
                            setShowNewList(false);
                            setNewListName('');
                          }
                        }}
                        placeholder={t('listNamePlaceholder')}
                        className="gt-field flex-1 px-2 py-1.5 text-xs"
                        autoFocus
                      />
                      <button
                        onClick={handleCreateList}
                        disabled={!newListName.trim()}
                        className="gt-button-primary min-h-0 px-3 py-1.5 text-xs"
                      >
                        {t('createBtn2')}
                      </button>
                      <button
                        onClick={() => {
                          setShowNewList(false);
                          setNewListName('');
                        }}
                        className="gt-button-ghost min-h-0 px-3 py-1.5 text-xs"
                      >
                        {t('cancelBtn')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <select
                        value={listId}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (v === -1) {
                            setShowNewList(true);
                            return;
                          }
                          setListId(v);
                        }}
                        className="gt-field flex-1 px-2 py-1.5 text-xs text-gray-600"
                      >
                        {userLists.map((l) => (
                          <option key={l.id} value={l.id}>
                            {getListDisplayName(l.name, t)}
                          </option>
                        ))}
                        <option value={-1}>+ {t('newList')}</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <section className="create-task-notes-island">
                <div className="create-task-island-label">
                  <label>
                    <FileText size={15} /> {t('description')}
                  </label>
                </div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('description')}
                  className="gt-field create-task-notes-input"
                />
              </section>

              <section className="create-task-subtasks">
                <button
                  type="button"
                  onClick={() => setShowSubtasks((shown) => !shown)}
                  className="create-task-subtasks-toggle"
                  aria-expanded={showSubtasks}
                  aria-controls="create-task-subtasks-panel"
                >
                  <span className="create-task-subtasks-label">
                    <CheckCircle2 size={16} /> {t('subtaskLabel')}
                  </span>
                  {draftSubtasks.length > 0 && (
                    <span className="create-task-subtasks-count">{draftSubtasks.length}</span>
                  )}
                  {showSubtasks ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <div
                  id="create-task-subtasks-panel"
                  className={`create-task-subtasks-panel ${showSubtasks ? 'is-expanded' : ''}`}
                >
                  <div className="create-task-subtasks-content">
                    {draftSubtasks.length > 0 && (
                      <div className="create-task-subtask-list">
                        {draftSubtasks.map((subtaskTitle, index) => (
                          <div key={`${subtaskTitle}-${index}`} className="create-task-subtask-row">
                            <span>{subtaskTitle}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setDraftSubtasks((subtasks) =>
                                  subtasks.filter((_, subtaskIndex) => subtaskIndex !== index),
                                )
                              }
                              aria-label={t('delete')}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="create-task-subtask-composer">
                      <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(event) => setNewSubtaskTitle(event.target.value)}
                        onCompositionStart={() => {
                          subtaskCompositionRef.current = true;
                        }}
                        onCompositionEnd={() => {
                          subtaskCompositionRef.current = false;
                        }}
                        onKeyDown={handleDraftSubtaskKeyDown}
                        placeholder={t('addSubtask')}
                        aria-label={t('addSubtask')}
                      />
                      <button
                        type="button"
                        onClick={addDraftSubtask}
                        disabled={!newSubtaskTitle.trim()}
                        aria-label={t('addSubtask')}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── MORE SETTINGS ── */}
              <div
                className={`create-task-more-settings grid ${
                  showMoreSettings ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="create-task-more-settings-content">
                    <section className="create-task-settings-module create-task-settings-module--time">
                      <h3 className="create-task-settings-module-title">
                        <Clock3 size={15} />
                        {words.timeSettings}
                      </h3>

                      <div className="create-task-module-row">
                        <span className="create-task-module-label">{words.preciseTime}</span>
                        <button
                          type="button"
                          className="create-task-switch"
                          aria-pressed={showPreciseTime}
                          aria-label={words.preciseTime}
                          onClick={() => setShowPreciseTime((value) => !value)}
                        >
                          <span />
                        </button>
                        {showPreciseTime && (
                          <div className="create-task-setting-details">
                            <div className="create-task-time-grid">
                              <div>
                                <label>{t('startDate')}</label>
                                <div className="gt-datetime-fields">
                                  <DateTimePicker
                                    type="date"
                                    value={dateStart}
                                    onChange={setDateStart}
                                    aria-label={t('startDate')}
                                    className="gt-field flex-1 px-2 py-1.5 text-sm"
                                  />
                                  <DateTimePicker
                                    type="time"
                                    value={dateStartTime}
                                    onChange={setDateStartTime}
                                    aria-label={t('startTime')}
                                    className="gt-field px-2 py-1.5 text-sm"
                                  />
                                </div>
                              </div>
                              <div>
                                <label>{t('endDate')}</label>
                                <div className="gt-datetime-fields">
                                  <DateTimePicker
                                    type="date"
                                    value={dateEnd}
                                    onChange={(value) => {
                                      setDurationMinutes('');
                                      setDateEnd(value);
                                    }}
                                    aria-label={t('endDate')}
                                    className="gt-field flex-1 px-2 py-1.5 text-sm"
                                  />
                                  <DateTimePicker
                                    type="time"
                                    value={dateEndTime}
                                    onChange={(value) => {
                                      setDurationMinutes('');
                                      setDateEndTime(value);
                                    }}
                                    aria-label={t('endTime')}
                                    className="gt-field px-2 py-1.5 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                            <label className="create-task-inline-field">
                              <span>{words.duration}</span>
                              <input
                                type="number"
                                min="1"
                                value={durationMinutes}
                                onChange={(event) =>
                                  setDurationMinutes(
                                    event.target.value
                                      ? Math.max(1, Number(event.target.value))
                                      : '',
                                  )
                                }
                              />
                              <em>{words.minutes}</em>
                            </label>
                            {dateStart && dateStartTime && dueDate && dueTime && (
                              <label className="create-task-check-row">
                                <input
                                  type="checkbox"
                                  checked={timeBlockLocked}
                                  onChange={(event) => setTimeBlockLocked(event.target.checked)}
                                />
                                <span>
                                  <strong>{words.lockBlock}</strong>
                                  <small>{words.lockBlockHint}</small>
                                </span>
                              </label>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="create-task-module-row">
                        <span className="create-task-module-label">{words.repeat}</span>
                        <SettingSelect
                          label={words.repeat}
                          value={repeatFrequency}
                          onChange={setRepeatFrequency}
                          options={[
                            { value: 'none', label: words.noRepeat },
                            { value: 'daily', label: words.daily },
                            { value: 'weekly', label: words.weekly },
                            { value: 'monthly', label: words.monthly },
                            { value: 'custom', label: words.custom },
                          ]}
                        />
                        {repeatFrequency !== 'none' && (
                          <div className="create-task-setting-details">
                            {(repeatFrequency === 'weekly' ||
                              (repeatFrequency === 'custom' && repeatUnit === 'week')) && (
                              <div className="create-task-weekdays" aria-label={words.repeat}>
                                {words.weekdays.map((day, index) => (
                                  <button
                                    key={day}
                                    type="button"
                                    aria-pressed={repeatWeekdays.includes(index)}
                                    onClick={() =>
                                      setRepeatWeekdays((days) =>
                                        days.includes(index)
                                          ? days.filter((value) => value !== index)
                                          : [...days, index],
                                      )
                                    }
                                  >
                                    {day}
                                  </button>
                                ))}
                              </div>
                            )}
                            {repeatFrequency === 'custom' && (
                              <label className="create-task-inline-field">
                                <span>{words.every}</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={repeatInterval}
                                  onChange={(event) =>
                                    setRepeatInterval(Math.max(1, Number(event.target.value) || 1))
                                  }
                                />
                                <select
                                  value={repeatUnit}
                                  onChange={(event) =>
                                    setRepeatUnit(event.target.value as RepeatUnit)
                                  }
                                >
                                  <option value="day">{words.day}</option>
                                  <option value="week">{words.week}</option>
                                  <option value="month">{words.month}</option>
                                </select>
                              </label>
                            )}
                            <label className="create-task-inline-field">
                              <span>{words.repeatEnd}</span>
                              <DateTimePicker
                                type="date"
                                value={repeatEndDate}
                                onChange={setRepeatEndDate}
                                aria-label={words.repeatEnd}
                                className="gt-field px-2 py-1.5 text-sm"
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      <div className="create-task-module-row">
                        <span className="create-task-module-label">{words.reminder}</span>
                        <SettingSelect
                          label={words.reminder}
                          value={reminderMode}
                          onChange={setReminderMode}
                          options={[
                            { value: 'none', label: words.none },
                            ...(dateStart && dateStartTime
                              ? [
                                  { value: 'start' as const, label: words.atStart },
                                  { value: '5' as const, label: words.before.replace('{n}', '5') },
                                  {
                                    value: '10' as const,
                                    label: words.before.replace('{n}', '10'),
                                  },
                                  {
                                    value: '30' as const,
                                    label: words.before.replace('{n}', '30'),
                                  },
                                  { value: 'custom' as const, label: words.customReminder },
                                ]
                              : []),
                            ...(dueDate && customReminderMinutes
                              ? [
                                  {
                                    value: 'due_before' as const,
                                    label: words.beforeDue.replace(
                                      '{n}',
                                      String(customReminderMinutes),
                                    ),
                                  },
                                ]
                              : []),
                            { value: 'due', label: words.atDue },
                          ]}
                        />
                        {reminderMode === 'custom' && (
                          <div className="create-task-setting-details">
                            <label className="create-task-inline-field">
                              <span>{words.customReminder}</span>
                              <input
                                type="number"
                                min="1"
                                value={customReminderMinutes}
                                onChange={(event) =>
                                  setCustomReminderMinutes(
                                    event.target.value
                                      ? Math.max(1, Number(event.target.value))
                                      : '',
                                  )
                                }
                              />
                              <em>{words.minutes}</em>
                            </label>
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="create-task-settings-module create-task-settings-module--priority">
                      <div className="create-task-module-row create-task-module-row--single">
                        <h3 className="create-task-settings-module-title">
                          <Gauge size={15} />
                          {t('priority')}
                        </h3>
                        <div className="create-task-priority-control">
                          {(
                            [
                              { value: 'low', label: words.priorityNormal },
                              { value: 'medium', label: words.priorityImportant },
                              { value: 'high', label: words.priorityUrgent },
                            ] as const
                          ).map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={priority === option.value}
                              onClick={() => setPriority(option.value)}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="create-task-settings-module create-task-settings-module--scheduling">
                      <h3 className="create-task-settings-module-title">
                        <CalendarClock size={15} />
                        {words.taskScheduling}
                      </h3>
                      <div className="create-task-module-row">
                        <span className="create-task-module-label">{words.scheduling}</span>
                        <SettingSelect
                          label={words.scheduling}
                          value={timeFlexibility}
                          onChange={setTimeFlexibility}
                          options={[
                            { value: 'fixed', label: words.fixed },
                            { value: 'suggested', label: words.suggested },
                            { value: 'anytime', label: words.anytime },
                            { value: 'window', label: words.window },
                          ]}
                        />
                        {timeFlexibility === 'window' && (
                          <div className="create-task-setting-details create-task-window-fields">
                            <label>
                              <span>{words.windowStart}</span>
                              <DateTimePicker
                                type="time"
                                value={timeWindowStart}
                                onChange={setTimeWindowStart}
                                aria-label={words.windowStart}
                                className="gt-field px-2 py-1.5 text-sm"
                              />
                            </label>
                            <label>
                              <span>{words.windowEnd}</span>
                              <DateTimePicker
                                type="time"
                                value={timeWindowEnd}
                                onChange={setTimeWindowEnd}
                                aria-label={words.windowEnd}
                                className="gt-field px-2 py-1.5 text-sm"
                              />
                            </label>
                            <label className="create-task-inline-field">
                              <span>{words.expectedDuration}</span>
                              <input
                                type="number"
                                min="1"
                                value={durationMinutes}
                                onChange={(event) =>
                                  setDurationMinutes(
                                    event.target.value
                                      ? Math.max(1, Number(event.target.value))
                                      : '',
                                  )
                                }
                              />
                              <em>{words.minutes}</em>
                            </label>
                          </div>
                        )}
                      </div>

                      <div className="create-task-module-row">
                        <span className="create-task-module-label">{words.unfinished}</span>
                        <SettingSelect
                          label={words.unfinished}
                          value={reschedulePolicy}
                          onChange={setReschedulePolicy}
                          options={[
                            { value: 'overdue', label: words.overdue },
                            { value: 'tomorrow', label: words.tomorrow },
                            { value: 'next_available', label: words.nextAvailable },
                          ]}
                        />
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>

            {/* ── ACTIONS ── */}
            <div className="modal-actions create-task-footer">
              <button
                onClick={() => handleSave('draft')}
                disabled={!hasTitle || isSubmitting}
                className="create-task-draft gt-button-ghost px-2 py-2.5 text-sm"
              >
                {t('saveDraft')}
              </button>
              <button
                type="button"
                onClick={handleCloseWithDraft}
                disabled={isSubmitting}
                className="create-task-cancel gt-button-ghost px-3 py-2.5 text-sm"
              >
                {t('cancelBtn')}
              </button>
              <button
                onClick={() => handleSave('active')}
                disabled={!hasTitle || isSubmitting}
                className="gt-button-primary create-task-submit py-2.5 text-sm"
              >
                {t('createTask3')}
              </button>
            </div>
          </>
        )}
        {draftToDelete && (
          <ConfirmDialog
            title={words.deleteDraft}
            message={words.deleteDraftConfirm.replace('{title}', draftToDelete.title)}
            confirmLabel={t('deleteBtn')}
            onCancel={() => setDraftToDelete(null)}
            onConfirm={handleDeleteDraft}
          />
        )}
      </div>
    </div>
  );
}
