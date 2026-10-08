import { useClockStore } from '../../stores/clock-store';
import { useT } from '../../lib/i18n';
import { requestNotificationPermission, getNotificationPermission } from '../../lib/time-utils';
import { Volume2, Bell, Clock } from 'lucide-react';

export function ClockSettingsPanel() {
  const { t } = useT();
  const settings = useClockStore((state) => state.clockSettings);
  const updateSettings = useClockStore((state) => state.updateClockSettings);

  if (!settings) return null;

  const perm = getNotificationPermission();

  return (
    <div className="clock-settings-panel">
      <div className="clock-settings-group">
        <div className="clock-settings-heading">
          <Clock size={16} /> {t('timeDisplay')}
        </div>
        <div
          className="gt-segmented clock-settings-format"
          role="group"
          aria-label={t('timeDisplay')}
        >
          {(['24h', '12h'] as const).map((format) => (
            <button
              key={format}
              type="button"
              aria-pressed={settings.timeFormat === format}
              onClick={() => updateSettings({ timeFormat: format })}
              className={`gt-segmented-item py-1.5 text-xs font-medium ${settings.timeFormat === format ? 'is-active text-blue-700' : 'text-gray-500'}`}
            >
              {t(format === '24h' ? 'format24h' : 'format12h')}
            </button>
          ))}
        </div>
        <label className="clock-settings-checkbox">
          <input
            type="checkbox"
            checked={settings.showSeconds}
            onChange={(event) => updateSettings({ showSeconds: event.target.checked })}
          />
          {t('showSec')}
        </label>
      </div>

      <div className="clock-settings-group">
        <div className="clock-settings-heading">
          <Volume2 size={16} /> {t('defaultVolume')}
        </div>
        <div className="clock-settings-value-row">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.defaultVolume}
            onChange={(event) => updateSettings({ defaultVolume: Number(event.target.value) })}
            className="flex-1"
          />
          <span className="clock-settings-value">{Math.round(settings.defaultVolume * 100)}%</span>
        </div>
      </div>

      <div className="clock-settings-group">
        <div className="clock-settings-heading">{t('defaultSound')}</div>
        <select
          value={settings.defaultSound}
          onChange={(event) => updateSettings({ defaultSound: event.target.value })}
          className="gt-field clock-settings-select"
        >
          <option value="beep">{t('soundBeep')}</option>
          <option value="soft">{t('soundSoft')}</option>
          <option value="digital">{t('soundDigital')}</option>
        </select>
      </div>

      <div className="clock-settings-group">
        <div className="clock-settings-heading">
          <Bell size={16} /> {t('defaultSnoozeDur')}
        </div>
        <select
          value={settings.defaultSnoozeMinutes}
          onChange={(event) => updateSettings({ defaultSnoozeMinutes: Number(event.target.value) })}
          className="gt-field clock-settings-select"
        >
          {[5, 9, 10, 15, 20, 30].map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} {t('min')}
            </option>
          ))}
        </select>
      </div>

      <div className="clock-settings-group">
        <div className="clock-settings-heading">{t('notifyPermission')}</div>
        <div className="clock-settings-permission-row">
          <span className={`clock-settings-permission is-${perm}`}>
            {perm === 'granted'
              ? t('notifyGranted')
              : perm === 'denied'
                ? t('notifyDenied')
                : t('notifyDefault')}
          </span>
          {perm !== 'granted' && (
            <button
              type="button"
              onClick={async () => {
                const result = await requestNotificationPermission();
                updateSettings({ notificationPermission: result });
              }}
              className="gt-button-secondary min-h-0 px-3 py-1.5 text-xs"
            >
              {t('requestNotify')}
            </button>
          )}
        </div>
        <p className="clock-settings-note">{t('browserLimit')}</p>
      </div>
    </div>
  );
}
