import { useEffect, useState } from 'react';
import { useUIStore } from '../../stores/ui-store';
import { useClockStore } from '../../stores/clock-store';
import { resetOnboarding } from '../onboarding/OnboardingGuide';
import { ClockSettingsPanel } from '../clock/ClockSettingsPanel';
import { exportDatabaseBackup } from '../../db/export-backup';
import { clearAllBusinessData } from '../../db/maintenance';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { todayISO } from '../../lib/format-date';
import {
  LANGUAGE_LABELS,
  useT,
  useCalendarCountry,
  getCountryName,
  type AppLanguage,
} from '../../lib/i18n';
import { COUNTRY_NAMES } from '../../lib/holiday-data';
import {
  readTaskExpandTrigger,
  saveTaskExpandTrigger,
  type TaskExpandTrigger,
} from '../../lib/task-expand-trigger';
import {
  DAILY_REMINDER_SETTINGS_CHANGED,
  DEFAULT_DAILY_REMINDER_SETTINGS,
  readDailyReminderSettings,
  saveDailyReminderSettings,
  type DailyReminderSettings,
} from '../../lib/daily-reminders';
import type { CountryCode } from '../../lib/types';
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  PlusCircle,
  Trash2,
  Download,
  RotateCcw,
  Info,
  MessageSquare,
  ChevronRight,
  HelpCircle,
  Globe,
  Clock,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

type ThemeMode = 'light' | 'dark' | 'system';
type FontSize = 'small' | 'normal' | 'large';
function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, val: T) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Settings remain usable when storage is unavailable.
  }
}

interface SettingsSectionHeaderProps {
  id: string;
  icon: LucideIcon;
  title: string;
  expanded: boolean;
  onToggle: (id: string) => void;
}

function SettingsSectionHeader({
  id,
  icon: Icon,
  title,
  expanded,
  onToggle,
}: SettingsSectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      aria-expanded={expanded}
      aria-controls={`settings-${id}`}
      className="settings-section-header"
    >
      <span className="settings-section-header-label">
        <Icon size={17} aria-hidden="true" />
        <span>{title}</span>
      </span>
      <ChevronRight
        size={16}
        aria-hidden="true"
        className={`settings-section-chevron ${expanded ? 'is-expanded' : ''}`}
      />
    </button>
  );
}

interface SettingsToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

function SettingsToggle({ checked, onChange, label }: SettingsToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`settings-toggle ${checked ? 'is-checked' : ''}`}
    >
      <span />
    </button>
  );
}

interface SettingsHelpButtonProps {
  label: string;
  onToggle: () => void;
}

function SettingsHelpButton({ label, onToggle }: SettingsHelpButtonProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className="settings-help-button"
      aria-label={label}
    >
      <HelpCircle size={13} />
    </button>
  );
}

export function SettingsPage() {
  const { t, rawLang, setLang, lang } = useT();
  const { calendarCountry, setCalendarCountry } = useCalendarCountry();
  const addToast = useUIStore((s) => s.addToast);
  const loadClockSettings = useClockStore((s) => s.loadClockSettings);

  useEffect(() => {
    void loadClockSettings();
  }, [loadClockSettings]);

  const [theme, setTheme] = useState<ThemeMode>(load('theme-mode', 'system'));
  const [fontSize, setFontSize] = useState<FontSize>(load('font-size', 'normal'));
  const [pendingCountry, setDraftCountry] = useState<CountryCode | null>(null);
  const draftCountry = pendingCountry ?? calendarCountry;
  const [notifyEnabled, setNotifyEnabled] = useState(load('notify-enabled', true));
  const [defaultReminder, setDefaultReminder] = useState(load('notify-reminder', 15));
  const [overdueReminder, setOverdueReminder] = useState(load('notify-overdue', true));
  const [notifySound, setNotifySound] = useState(load('notify-sound', true));
  const [dailyReminders, setDailyReminders] =
    useState<DailyReminderSettings>(readDailyReminderSettings);
  const [defaultDueDate, setDefaultDueDate] = useState(load('task-default-due', false));
  const [taskExpandTrigger, setTaskExpandTrigger] =
    useState<TaskExpandTrigger>(readTaskExpandTrigger);
  const [sections, setSections] = useState<Record<string, boolean>>({
    appearance: true,
    lang: true,
    notify: true,
    clock: true,
    task: true,
    data: false,
    about: false,
  });
  const [showHelp, setShowHelp] = useState<Record<string, boolean>>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const toggle = (s: string) => setSections((p) => ({ ...p, [s]: !p[s] }));
  const toggleHelp = (k: string) => setShowHelp((p) => ({ ...p, [k]: !p[k] }));

  const applyTheme = (m: ThemeMode) => {
    setTheme(m);
    save('theme-mode', m);
    if (m === 'dark') document.documentElement.classList.add('dark');
    else if (m === 'light') document.documentElement.classList.remove('dark');
    else
      document.documentElement.classList.toggle(
        'dark',
        window.matchMedia('(prefers-color-scheme:dark)').matches,
      );
    addToast(t('themeUpdated'), 'success');
  };
  const applyFont = (s: FontSize) => {
    setFontSize(s);
    save('font-size', s);
    document.documentElement.classList.remove(
      'font-scale-small',
      'font-scale-normal',
      'font-scale-large',
    );
    document.documentElement.classList.add(`font-scale-${s}`);
    addToast(t('fontUpdated'), 'success');
  };
  const handleSaveCountry = () => {
    setCalendarCountry(draftCountry);
    setDraftCountry(null);
    addToast(t('langUpdated'), 'success');
  };
  const countryModified = draftCountry !== calendarCountry;
  const saveAndToast = <T,>(k: string, v: T, m: string) => {
    save(k, v);
    addToast(m, 'success');
  };
  const updateDailyReminders = (patch: Partial<DailyReminderSettings>) => {
    setDailyReminders((current) => {
      const next = { ...current, ...patch };
      saveDailyReminderSettings(next);
      return next;
    });
  };

  const handleClearAll = async () => {
    try {
      await clearAllBusinessData();
      setShowClearConfirm(false);
      addToast(t('dataCleared'), 'success');
      setTimeout(() => window.location.reload(), 500);
    } catch {
      addToast(t('operationFailed'), 'error');
    }
  };
  const handleExport = async () => {
    let data;
    try {
      data = await exportDatabaseBackup();
    } catch {
      addToast(t('dataExportFailed'), 'error');
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `g-tasker-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    addToast(t('dataExported'), 'success');
  };
  const handleReset = () => {
    if (!confirm(t('confirmReset'))) return;
    applyTheme('system');
    applyFont('normal');
    save('notify-enabled', true);
    setNotifyEnabled(true);
    save('notify-reminder', 15);
    setDefaultReminder(15);
    save('notify-overdue', true);
    setOverdueReminder(true);
    save('notify-sound', true);
    setNotifySound(true);
    saveDailyReminderSettings(DEFAULT_DAILY_REMINDER_SETTINGS);
    setDailyReminders(DEFAULT_DAILY_REMINDER_SETTINGS);
    save('task-default-due', false);
    setDefaultDueDate(false);
    saveTaskExpandTrigger('click');
    setTaskExpandTrigger('click');
    try {
      localStorage.removeItem('tag-categories');
    } catch {
      // Reset the remaining settings even when storage is unavailable.
    }
    addToast(t('settingsReset'), 'success');
    setTimeout(() => window.location.reload(), 500);
  };

  const L = {
    themeMode: t('themeMode'),
    light: t('light'),
    dark: t('dark'),
    followSystem: t('followSystem'),
    fontSize: t('fontSize'),
    fontSmall: t('fontSmall'),
    fontNormal: t('fontNormal'),
    fontLarge: t('fontLarge'),
    langTitle: t('langTitle'),
    uiLang: t('uiLang'),
    calCountry: t('calCountry'),
    save: t('save'),
    notifyTitle: t('notifyTitle'),
    notifySwitch: t('notifySwitch'),
    notifyReminder: t('notifyReminder'),
    notifyOverdue: t('notifyOverdue'),
    notifySound: t('notifySound'),
    dailyReminderTitle: t('dailyReminderTitle'),
    morningReminder: t('morningReminder'),
    morningReminderTime: t('morningReminderTime'),
    eveningReminder: t('eveningReminder'),
    eveningReminderTime: t('eveningReminderTime'),
    weekendReminder: t('weekendReminder'),
    showNoTasksReminder: t('showNoTasksReminder'),
    taskDefaults: t('taskDefaults'),
    taskExpandTrigger: t('taskExpandTrigger'),
    taskExpandClick: t('taskExpandClick'),
    taskExpandHover: t('taskExpandHover'),
    defaultDue: t('defaultDue'),
    dataMgmt: t('dataMgmt'),
    exportData: t('exportData'),
    resetSettings: t('resetSettings'),
    clearAll: t('clearAll'),
    about: t('about'),
    version: t('version'),
    developer: t('developer'),
    techStack: t('techStack'),
    sendFeedback: t('sendFeedback'),
    aboutDesc: t('aboutDesc'),
    appearance: t('appearance'),
    clockSettings: t('clockSettings'),
  };

  return (
    <div className="settings-page">
      <div className="settings-section gt-material-content" data-ui="settings-group">
        <SettingsSectionHeader
          id="appearance"
          icon={Sun}
          title={L.appearance}
          expanded={sections.appearance}
          onToggle={toggle}
        />
        {sections.appearance && (
          <div id="settings-appearance" className="pb-4 space-y-4 animate-slide-down">
            <div>
              <p className="text-xs text-gray-400 mb-2">{L.themeMode}</p>
              <div className="gt-segmented">
                {(
                  [
                    ['light', Sun, L.light],
                    ['dark', Moon, L.dark],
                    ['system', Monitor, L.followSystem],
                  ] as const
                ).map(([v, Ic, lb]) => (
                  <button
                    key={v}
                    onClick={() => applyTheme(v)}
                    aria-pressed={theme === v}
                    className={`gt-segmented-item flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${theme === v ? 'is-active text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Ic size={14} /> {lb}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">{L.fontSize}</p>
              <div className="gt-segmented">
                {(['small', 'normal', 'large'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => applyFont(s)}
                    aria-pressed={fontSize === s}
                    className={`gt-segmented-item py-1.5 text-xs font-medium transition-colors ${fontSize === s ? 'is-active text-blue-700' : 'text-gray-500'}`}
                  >
                    {s === 'small' ? L.fontSmall : s === 'normal' ? L.fontNormal : L.fontLarge}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section gt-material-content" data-ui="settings-group">
        <div className="settings-section-heading-row">
          <SettingsSectionHeader
            id="lang"
            icon={Globe}
            title={L.langTitle}
            expanded={sections.lang}
            onToggle={toggle}
          />
          {countryModified && (
            <button
              onClick={handleSaveCountry}
              className="gt-button-primary min-h-0 px-3 py-1.5 text-xs flex-shrink-0 ml-2"
            >
              {L.save}
            </button>
          )}
        </div>
        {sections.lang && (
          <div id="settings-lang" className="pb-4 space-y-4 animate-slide-down">
            <div>
              <p className="text-xs text-gray-400 mb-2">{L.uiLang}</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(LANGUAGE_LABELS) as [AppLanguage, string][])
                  .filter(([code]) => code !== 'auto')
                  .map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => setLang(code)}
                      aria-pressed={rawLang === code}
                      className={`gt-button-secondary px-2 py-1.5 text-xs ${rawLang === code ? 'border-blue-300 text-blue-700' : 'text-gray-500'}`}
                    >
                      {name}
                    </button>
                  ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">{L.calCountry}</p>
              <select
                aria-label={L.calCountry}
                value={draftCountry}
                onChange={(e) => setDraftCountry(e.target.value as CountryCode)}
                className="gt-field w-full sm:w-64 px-3 py-2 text-sm"
              >
                {(Object.keys(COUNTRY_NAMES) as CountryCode[]).map((code) => (
                  <option key={code} value={code}>
                    {getCountryName(code, lang)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section gt-material-content" data-ui="settings-group">
        <SettingsSectionHeader
          id="notify"
          icon={Bell}
          title={L.notifyTitle}
          expanded={sections.notify}
          onToggle={toggle}
        />
        {sections.notify && (
          <div id="settings-notify" className="pb-4 space-y-4 animate-slide-down">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-600 dark:text-gray-400">{L.notifySwitch}</span>
                <SettingsHelpButton
                  label={t('notificationsHelp')}
                  onToggle={() => toggleHelp('n0')}
                />
              </div>
              <SettingsToggle
                label={L.notifySwitch}
                checked={notifyEnabled}
                onChange={(v) => {
                  setNotifyEnabled(v);
                  saveAndToast('notify-enabled', v, v ? t('notifyOn') : t('notifyOff'));
                  window.dispatchEvent(new Event(DAILY_REMINDER_SETTINGS_CHANGED));
                }}
              />
            </div>
            {showHelp.n0 && (
              <p className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2">
                {t('helpNotifySwitch')}
              </p>
            )}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{L.notifyReminder}</span>
                <SettingsHelpButton
                  label={t('notificationsHelp')}
                  onToggle={() => toggleHelp('n1')}
                />
              </div>
              {showHelp.n1 && (
                <p className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2 mb-2">
                  {t('helpNotifyReminder')}
                </p>
              )}
              <div className="gt-segmented">
                {[5, 15, 60].map((m) => (
                  <button
                    key={m}
                    aria-pressed={defaultReminder === m}
                    onClick={() => {
                      setDefaultReminder(m);
                      saveAndToast('notify-reminder', m, `${L.notifyReminder}: ${m}${t('minAgo')}`);
                    }}
                    className={`gt-segmented-item py-1.5 text-xs font-medium ${defaultReminder === m ? 'is-active text-blue-700' : 'text-gray-500'}`}
                  >
                    {m < 60 ? `${m}${t('minAgo')}` : `1${t('hrAgo')}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-600 dark:text-gray-400">{L.notifyOverdue}</span>
                <SettingsHelpButton label={t('overdueHelp')} onToggle={() => toggleHelp('n2')} />
              </div>
              <SettingsToggle
                label={L.notifyOverdue}
                checked={overdueReminder}
                onChange={(v) => {
                  setOverdueReminder(v);
                  save('notify-overdue', v);
                  window.dispatchEvent(new Event(DAILY_REMINDER_SETTINGS_CHANGED));
                }}
              />
            </div>
            {showHelp.n2 && (
              <p className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2">
                {t('helpNotifyOverdue')}
              </p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-600 dark:text-gray-400">{L.notifySound}</span>
                <SettingsHelpButton label={t('soundHelp')} onToggle={() => toggleHelp('n3')} />
              </div>
              <SettingsToggle
                label={L.notifySound}
                checked={notifySound}
                onChange={(v) => {
                  setNotifySound(v);
                  save('notify-sound', v);
                  window.dispatchEvent(new Event(DAILY_REMINDER_SETTINGS_CHANGED));
                }}
              />
            </div>
            {showHelp.n3 && (
              <p className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2">
                {t('helpNotifySound')}
              </p>
            )}
            <div className="border-t border-gray-200/70 dark:border-white/10 pt-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {L.dailyReminderTitle}
              </p>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {L.morningReminder}
                </span>
                <SettingsToggle
                  label={L.morningReminder}
                  checked={dailyReminders.morningEnabled}
                  onChange={(morningEnabled) => updateDailyReminders({ morningEnabled })}
                />
              </div>
              <label className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {L.morningReminderTime}
                </span>
                <input
                  type="time"
                  aria-label={L.morningReminderTime}
                  value={dailyReminders.morningTime}
                  disabled={!dailyReminders.morningEnabled}
                  onChange={(event) => updateDailyReminders({ morningTime: event.target.value })}
                  className="gt-field w-32 px-3 py-1.5 text-sm disabled:opacity-50"
                />
              </label>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {L.eveningReminder}
                </span>
                <SettingsToggle
                  label={L.eveningReminder}
                  checked={dailyReminders.eveningEnabled}
                  onChange={(eveningEnabled) => updateDailyReminders({ eveningEnabled })}
                />
              </div>
              <label className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {L.eveningReminderTime}
                </span>
                <input
                  type="time"
                  aria-label={L.eveningReminderTime}
                  value={dailyReminders.eveningTime}
                  disabled={!dailyReminders.eveningEnabled}
                  onChange={(event) => updateDailyReminders({ eveningTime: event.target.value })}
                  className="gt-field w-32 px-3 py-1.5 text-sm disabled:opacity-50"
                />
              </label>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {L.weekendReminder}
                </span>
                <SettingsToggle
                  label={L.weekendReminder}
                  checked={dailyReminders.weekendEnabled}
                  onChange={(weekendEnabled) => updateDailyReminders({ weekendEnabled })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {L.showNoTasksReminder}
                </span>
                <SettingsToggle
                  label={L.showNoTasksReminder}
                  checked={dailyReminders.showWhenNoTasks}
                  onChange={(showWhenNoTasks) => updateDailyReminders({ showWhenNoTasks })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section gt-material-content" data-ui="settings-group">
        <SettingsSectionHeader
          id="clock"
          icon={Clock}
          title={L.clockSettings}
          expanded={sections.clock}
          onToggle={toggle}
        />
        {sections.clock && (
          <div id="settings-clock" className="pb-4 animate-slide-down">
            <ClockSettingsPanel />
          </div>
        )}
      </div>

      <div className="settings-section gt-material-content" data-ui="settings-group">
        <SettingsSectionHeader
          id="task"
          icon={PlusCircle}
          title={L.taskDefaults}
          expanded={sections.task}
          onToggle={toggle}
        />
        {sections.task && (
          <div id="settings-task" className="pb-4 space-y-4 animate-slide-down">
            <div>
              <span className="mb-2 block text-sm text-gray-600 dark:text-gray-400">
                {L.taskExpandTrigger}
              </span>
              <div className="gt-segmented" role="group" aria-label={L.taskExpandTrigger}>
                {(
                  [
                    ['click', L.taskExpandClick],
                    ['hover', L.taskExpandHover],
                  ] as const
                ).map(([trigger, label]) => (
                  <button
                    key={trigger}
                    type="button"
                    aria-pressed={taskExpandTrigger === trigger}
                    onClick={() => {
                      setTaskExpandTrigger(trigger);
                      saveTaskExpandTrigger(trigger);
                    }}
                    className={`gt-segmented-item py-1.5 text-xs font-medium ${taskExpandTrigger === trigger ? 'is-active text-blue-700' : 'text-gray-500'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-600 dark:text-gray-400">{L.defaultDue}</span>
                <SettingsHelpButton label={t('dueDateHelp')} onToggle={() => toggleHelp('t1')} />
              </div>
              <SettingsToggle
                label={L.defaultDue}
                checked={defaultDueDate}
                onChange={(v) => {
                  setDefaultDueDate(v);
                  save('task-default-due', v);
                }}
              />
            </div>
            {showHelp.t1 && (
              <p className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2">
                {t('helpDefaultDue')}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="settings-section gt-material-content" data-ui="settings-group">
        <SettingsSectionHeader
          id="data"
          icon={Trash2}
          title={L.dataMgmt}
          expanded={sections.data}
          onToggle={toggle}
        />
        {sections.data && (
          <div id="settings-data" className="pb-4 space-y-3 animate-slide-down">
            <button
              onClick={handleExport}
              className="gt-list-row gt-button-ghost w-full flex items-center justify-start gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300"
            >
              <Download size={16} /> {L.exportData}
            </button>
            <button
              onClick={handleReset}
              className="gt-list-row gt-button-ghost w-full flex items-center justify-start gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300"
            >
              <RotateCcw size={16} /> {L.resetSettings}
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="gt-list-row gt-button-danger w-full flex items-center justify-start gap-3 px-3 py-2.5 text-sm"
            >
              <Trash2 size={16} /> {L.clearAll}
            </button>
          </div>
        )}
      </div>

      <div className="settings-section gt-material-content" data-ui="settings-group">
        <SettingsSectionHeader
          id="about"
          icon={Info}
          title={L.about}
          expanded={sections.about}
          onToggle={toggle}
        />
        {sections.about && (
          <div
            id="settings-about"
            className="pb-6 space-y-3 animate-slide-down text-sm text-gray-600 dark:text-gray-400"
          >
            <div className="flex justify-between py-1">
              <span className="text-gray-400">{L.version}</span>
              <span className="font-medium">v0.2.0</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-400">{L.developer}</span>
              <span>Gerahamu</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-400">{L.techStack}</span>
              <span>React + TypeScript + Dexie</span>
            </div>
            <button
              onClick={() => {
                resetOnboarding();
                window.location.reload();
              }}
              className="flex items-center gap-2 text-blue-500 hover:text-blue-700 text-sm"
            >
              <Sparkles size={14} /> {t('revisitGuide')}
            </button>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                addToast(t('feedbackDeferred'), 'info');
              }}
              className="flex items-center gap-2 text-blue-500 hover:text-blue-700"
            >
              <MessageSquare size={14} /> {L.sendFeedback}
            </a>
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-xs text-gray-400">{L.aboutDesc}</p>
            </div>
          </div>
        )}
      </div>

      <div className="h-12" />
      {showClearConfirm && (
        <ConfirmDialog
          title={L.clearAll}
          message={t('confirmClearAll')}
          confirmLabel={t('deleteBtn')}
          onConfirm={() => void handleClearAll()}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
}
