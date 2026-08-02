import { useEffect } from 'react';
import { useClockStore } from '../../stores/clock-store';
import { useT } from '../../lib/i18n';
import { reminderEngine } from '../../lib/reminder-engine';
import { Bell, X, Clock } from 'lucide-react';

export function ReminderOverlay() {
  const { t } = useT();
  const activeReminders = useClockStore(s => s.activeReminders);
  const showReminder = useClockStore(s => s.showReminder);
  const dismissReminder = useClockStore(s => s.dismissReminder);
  const snoozeReminder = useClockStore(s => s.snoozeReminder);

  useEffect(() => {
    const unsub = reminderEngine.onShow((event) => {
      showReminder(event);
    });
    return unsub;
  }, [showReminder]);

  if (activeReminders.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none">
      {activeReminders.map(rem => (
        <div
          key={rem.id}
          className="pointer-events-auto card p-5 m-4 max-w-sm w-full animate-modal-in bg-white dark:bg-gray-800 shadow-xl border-2 border-blue-300 dark:border-blue-700"
          role="alertdialog"
          aria-label={rem.name}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-500">
              <Bell size={24} className="animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-lg">
                {rem.source === 'countdown' ? t('countdownFinished') : t('alarmReminder')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{rem.name}</div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(rem.triggeredAt).toLocaleTimeString()}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => dismissReminder(rem.id)}
                  className="btn btn-primary text-sm flex items-center gap-1 py-1.5 px-4"
                >
                  <X size={16} /> {t('stop')}
                </button>
                {rem.snoozeEnabled && (
                  <button
                    onClick={() => snoozeReminder(rem.id)}
                    className="btn btn-ghost text-sm flex items-center gap-1 py-1.5 px-3"
                  >
                    <Clock size={16} /> {t('snooze')} ({rem.snoozeMinutes}{t('min')})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
