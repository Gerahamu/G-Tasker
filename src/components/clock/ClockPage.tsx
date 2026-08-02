import { useEffect } from 'react';
import { useClockStore } from '../../stores/clock-store';
import { useT } from '../../lib/i18n';
import { WorldClockPanel } from './WorldClockPanel';
import { StopwatchPanel } from './StopwatchPanel';
import { CountdownPanel } from './CountdownPanel';
import { AlarmPanel } from './AlarmPanel';
import { ClockSettingsPanel } from './ClockSettingsPanel';
import { ReminderOverlay } from './ReminderOverlay';
import { Globe, Timer, Hourglass, Bell, Settings } from 'lucide-react';

type Tab = 'worldclock' | 'stopwatch' | 'countdown' | 'alarm' | 'settings';

const TABS: { key: Tab; icon: typeof Globe; labelKey: string }[] = [
  { key: 'worldclock', icon: Globe, labelKey: 'worldClock' },
  { key: 'stopwatch', icon: Timer, labelKey: 'stopwatch' },
  { key: 'countdown', icon: Hourglass, labelKey: 'countdown' },
  { key: 'alarm', icon: Bell, labelKey: 'alarmClock' },
  { key: 'settings', icon: Settings, labelKey: 'settings' },
];

export function ClockPage() {
  const { t } = useT();
  const activeTab = useClockStore((s) => s.activeTab);
  const setActiveTab = useClockStore((s) => s.setActiveTab);
  const startPolling = useClockStore((s) => s.startPolling);
  const stopPolling = useClockStore((s) => s.stopPolling);
  const loadStopwatch = useClockStore((s) => s.loadStopwatch);
  const loadCountdowns = useClockStore((s) => s.loadCountdowns);
  const loadAlarms = useClockStore((s) => s.loadAlarms);
  const loadTimezones = useClockStore((s) => s.loadTimezones);
  const loadClockSettings = useClockStore((s) => s.loadClockSettings);

  useEffect(() => {
    loadTimezones();
    loadStopwatch();
    loadCountdowns();
    loadAlarms();
    loadClockSettings();
    startPolling();
    return () => {
      stopPolling();
    };
  }, [
    loadAlarms,
    loadClockSettings,
    loadCountdowns,
    loadStopwatch,
    loadTimezones,
    startPolling,
    stopPolling,
  ]);

  return (
    <div className="space-y-4">
      <h2 className="page-title">{t('clock')}</h2>

      {/* Tab bar — scrollable on mobile */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto -mx-1 px-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap
              ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400 -mb-[1px]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            aria-label={t(tab.labelKey)}
            aria-selected={activeTab === tab.key}
            role="tab"
          >
            <tab.icon size={16} />
            <span className="hidden sm:inline">{t(tab.labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="min-h-[400px]">
        {activeTab === 'worldclock' && <WorldClockPanel />}
        {activeTab === 'stopwatch' && <StopwatchPanel />}
        {activeTab === 'countdown' && <CountdownPanel />}
        {activeTab === 'alarm' && <AlarmPanel />}
        {activeTab === 'settings' && <ClockSettingsPanel />}
      </div>

      {/* Global reminder overlay */}
      <ReminderOverlay />
    </div>
  );
}
