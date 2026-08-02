import { useState, useCallback } from 'react';
import { useClockStore } from '../../stores/clock-store';
import { useT } from '../../lib/i18n';
import { calcNextRingTime, formatNextRingTime } from '../../lib/time-utils';
import type { Alarm, AlarmRepeatType } from '../../lib/clock-types';
import { Plus, Trash2, Edit3, Copy, Bell, BellOff, Volume2 } from 'lucide-react';

const DAY_LABELS = ['sunShort', 'monShort', 'tueShort', 'wedShort', 'thuShort', 'friShort', 'satShort'];

export function AlarmPanel() {
  const { t } = useT();
  const alarms = useClockStore(s => s.alarms);
  const createAlarm = useClockStore(s => s.createAlarm);
  const updateAlarm = useClockStore(s => s.updateAlarm);
  const deleteAlarm = useClockStore(s => s.deleteAlarm);
  const toggleAlarm = useClockStore(s => s.toggleAlarm);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formH, setFormH] = useState(7);
  const [formM, setFormM] = useState(0);
  const [formRepeatType, setFormRepeatType] = useState<AlarmRepeatType>('daily');
  const [formCustomDays, setFormCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formSpecificDate, setFormSpecificDate] = useState('');
  const [formSnoozeEnabled, setFormSnoozeEnabled] = useState(true);
  const [formSnoozeMin, setFormSnoozeMin] = useState(9);
  const [formVolume, setFormVolume] = useState(0.7);

  const openNew = useCallback(() => {
    const now = new Date();
    setEditId(null);
    setFormName('');
    setFormH(now.getHours());
    setFormM(now.getMinutes());
    setFormRepeatType('once');
    setFormCustomDays([1, 2, 3, 4, 5]);
    setFormSpecificDate(now.toISOString().slice(0, 10));
    setFormSnoozeEnabled(true);
    setFormSnoozeMin(9);
    setFormVolume(0.7);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((al: Alarm) => {
    setEditId(al.id ?? null);
    setFormName(al.name);
    setFormH(al.hour);
    setFormM(al.minute);
    setFormRepeatType(al.repeatRule.type);
    setFormCustomDays(al.repeatRule.customDays);
    setFormSpecificDate(al.repeatRule.specificDate || '');
    setFormSnoozeEnabled(al.snoozeEnabled);
    setFormSnoozeMin(al.snoozeMinutes);
    setFormVolume(al.volume);
    setShowForm(true);
  }, []);

  const openCopy = useCallback((al: Alarm) => {
    setEditId(null);
    setFormName(`${al.name} (copy)`);
    setFormH(al.hour);
    setFormM(al.minute);
    setFormRepeatType(al.repeatRule.type);
    setFormCustomDays(al.repeatRule.customDays);
    setFormSpecificDate(al.repeatRule.specificDate || '');
    setFormSnoozeEnabled(al.snoozeEnabled);
    setFormSnoozeMin(al.snoozeMinutes);
    setFormVolume(al.volume);
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    const data = {
      name: formName || 'Alarm',
      hour: formH, minute: formM,
      enabled: true,
      repeatRule: {
        type: formRepeatType,
        customDays: formRepeatType === 'custom' ? formCustomDays : [],
        specificDate: formRepeatType === 'once' ? formSpecificDate : null,
      },
      soundName: 'beep', volume: formVolume,
      snoozeEnabled: formSnoozeEnabled, snoozeMinutes: formSnoozeMin,
      notes: '',
    };
    if (editId != null) {
      await updateAlarm(editId, data);
    } else {
      await createAlarm(data);
    }
    setShowForm(false);
  }, [editId, formName, formH, formM, formRepeatType, formCustomDays, formSpecificDate, formSnoozeEnabled, formSnoozeMin, formVolume, createAlarm, updateAlarm]);

  const toggleDay = (day: number) => {
    setFormCustomDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort(),
    );
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{alarms.length} {t('alarmClock')}</span>
        <button onClick={openNew} className="btn btn-ghost text-sm flex items-center gap-1">
          <Plus size={16} /> {t('newAlarm')}
        </button>
      </div>

      {/* Browser limitation note */}
      <div className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
        {t('browserLimit')}
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-4 animate-slide-down space-y-3">
          <input
            value={formName}
            onChange={e => setFormName(e.target.value)}
            placeholder={t('alarmName')}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800"
            aria-label={t('alarmName')}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="23" value={formH} onChange={e => setFormH(Number(e.target.value))}
              className="w-16 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center bg-white dark:bg-gray-800" aria-label={t('hours')} />
            <span>:</span>
            <input type="number" min="0" max="59" value={formM} onChange={e => setFormM(Number(e.target.value))}
              className="w-16 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center bg-white dark:bg-gray-800" aria-label={t('mins')} />
          </div>

          {/* Repeat type */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">{t('repeatRule')}</label>
            <div className="flex flex-wrap gap-1">
              {([
                ['once', t('once')],
                ['daily', t('daily')],
                ['workdays', t('workdays')],
                ['weekends', t('weekends')],
                ['custom', t('customDays')],
              ] as const).map(([val, label]) => (
                <button key={val}
                  onClick={() => setFormRepeatType(val)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                    formRepeatType === val
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom days */}
          {formRepeatType === 'custom' && (
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map(day => (
                <button key={day}
                  onClick={() => toggleDay(day)}
                  className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${
                    formCustomDays.includes(day)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'
                  }`}
                  aria-pressed={formCustomDays.includes(day)}
                >
                  {t(DAY_LABELS[day])}
                </button>
              ))}
            </div>
          )}

          {/* Specific date for once */}
          {formRepeatType === 'once' && (
            <input type="date" value={formSpecificDate}
              onChange={e => setFormSpecificDate(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800" />
          )}

          {/* Snooze */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <input type="checkbox" checked={formSnoozeEnabled} onChange={e => setFormSnoozeEnabled(e.target.checked)} />
              {t('enableSnooze')}
            </label>
            {formSnoozeEnabled && (
              <select value={formSnoozeMin} onChange={e => setFormSnoozeMin(Number(e.target.value))}
                className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800">
                {[5, 9, 10, 15, 20, 30].map(m => (
                  <option key={m} value={m}>{m} {t('min')}</option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <Volume2 size={12} />
              <input type="range" min="0" max="1" step="0.1" value={formVolume} onChange={e => setFormVolume(Number(e.target.value))}
                className="w-20" />
            </label>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="btn btn-ghost text-sm">{t('cancel')}</button>
            <button onClick={handleSubmit} className="btn btn-primary text-sm">{editId != null ? t('save') : t('createBtn2')}</button>
          </div>
        </div>
      )}

      {/* Alarm cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {alarms.map(al => {
          const nextRing = calcNextRingTime(al.hour, al.minute, al.repeatRule);
          return (
            <div key={al.id} className={`card p-4 group ${!al.enabled ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <button
                    onClick={() => al.id != null && toggleAlarm(al.id)}
                    className={`p-1.5 rounded-full transition-colors ${
                      al.enabled ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-400 bg-gray-100 dark:bg-gray-700'
                    }`}
                    aria-label={al.enabled ? t('stopAlarm') : t('start')}
                  >
                    {al.enabled ? <Bell size={16} /> : <BellOff size={16} />}
                  </button>
                </div>
                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(al)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" aria-label={t('editBtn')}>
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => openCopy(al)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" aria-label={t('copyAlarm')}>
                    <Copy size={13} />
                  </button>
                  <button onClick={() => al.id != null && deleteAlarm(al.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-400" aria-label={t('delete')}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="mt-2">
                <div className="text-2xl font-bold tabular-nums">
                  {String(al.hour).padStart(2, '0')}:{String(al.minute).padStart(2, '0')}
                </div>
                <div className="text-sm truncate">{al.name || t('alarmClock')}</div>
                <div className="text-xs text-gray-400">
                  {al.repeatRule.type === 'once' ? t('once') :
                   al.repeatRule.type === 'daily' ? t('daily') :
                   al.repeatRule.type === 'workdays' ? t('workdays') :
                   al.repeatRule.type === 'weekends' ? t('weekends') :
                   al.repeatRule.customDays.map(d => t(DAY_LABELS[d])).join(', ')}
                </div>
                <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                  {formatNextRingTime(nextRing, t)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {alarms.length === 0 && !showForm && (
        <div className="text-center text-gray-400 py-12">{t('noAlarms')}</div>
      )}
    </div>
  );
}
