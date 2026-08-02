import { useClockStore } from '../../stores/clock-store';
import { useT } from '../../lib/i18n';
import { requestNotificationPermission, getNotificationPermission } from '../../lib/time-utils';
import { Volume2, Bell, Clock } from 'lucide-react';

export function ClockSettingsPanel() {
  const { t } = useT();
  const settings = useClockStore(s => s.clockSettings);
  const updateSettings = useClockStore(s => s.updateClockSettings);

  if (!settings) return null;

  const perm = getNotificationPermission();

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Time display */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Clock size={16} /> {t('timeDisplay')}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => updateSettings({ timeFormat: '24h' })}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              settings.timeFormat === '24h' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            {t('format24h')}
          </button>
          <button
            onClick={() => updateSettings({ timeFormat: '12h' })}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              settings.timeFormat === '12h' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            {t('format12h')}
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.showSeconds}
            onChange={e => updateSettings({ showSeconds: e.target.checked })}
          />
          {t('showSec')}
        </label>
      </div>

      {/* Volume */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Volume2 size={16} /> {t('defaultVolume')}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range" min="0" max="1" step="0.1"
            value={settings.defaultVolume}
            onChange={e => updateSettings({ defaultVolume: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="text-sm tabular-nums w-10">{Math.round(settings.defaultVolume * 100)}%</span>
        </div>
      </div>

      {/* Snooze */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Bell size={16} /> {t('defaultSnoozeDur')}
        </div>
        <select
          value={settings.defaultSnoozeMinutes}
          onChange={e => updateSettings({ defaultSnoozeMinutes: Number(e.target.value) })}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800"
        >
          {[5, 9, 10, 15, 20, 30].map(m => (
            <option key={m} value={m}>{m} {t('min')}</option>
          ))}
        </select>
      </div>

      {/* Notification permission */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('notifyPermission')}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm px-2 py-1 rounded ${
            perm === 'granted' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
            perm === 'denied' ? 'bg-red-100 dark:bg-red-900/30 text-red-400' :
            'bg-gray-100 dark:bg-gray-700 text-gray-500'
          }`}>
            {perm === 'granted' ? t('notifyGranted') : perm === 'denied' ? t('notifyDenied') : t('notifyDefault')}
          </span>
          {perm !== 'granted' && (
            <button
              onClick={async () => {
                const result = await requestNotificationPermission();
                updateSettings({ notificationPermission: result });
              }}
              className="btn btn-primary text-xs py-1 px-3"
            >
              {t('requestNotify')}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400">{t('browserLimit')}</p>
      </div>
    </div>
  );
}
