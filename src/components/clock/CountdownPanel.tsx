import { useState, useCallback } from 'react';
import { useClockStore } from '../../stores/clock-store';
import { useT } from '../../lib/i18n';
import { formatCountdown } from '../../lib/time-utils';
import type { Countdown, CountdownStatus } from '../../lib/clock-types';
import { Play, Pause, RotateCcw, Plus, Trash2, Edit3, ChevronUp, ChevronDown } from 'lucide-react';

const PRESETS = [
  { labelKey: 'preset1min', seconds: 60 },
  { labelKey: 'preset5min', seconds: 300 },
  { labelKey: 'preset10min', seconds: 600 },
  { labelKey: 'preset15min', seconds: 900 },
  { labelKey: 'preset25min', seconds: 1500 },
  { labelKey: 'preset30min', seconds: 1800 },
  { labelKey: 'preset45min', seconds: 2700 },
  { labelKey: 'preset60min', seconds: 3600 },
];

export function CountdownPanel() {
  const { t } = useT();
  const countdowns = useClockStore(s => s.countdowns);
  const displays = useClockStore(s => s.countdownDisplays);
  const createCountdown = useClockStore(s => s.createCountdown);
  const updateCountdown = useClockStore(s => s.updateCountdown);
  const deleteCountdown = useClockStore(s => s.deleteCountdown);
  const cdStart = useClockStore(s => s.countdownStart);
  const cdPause = useClockStore(s => s.countdownPause);
  const cdResume = useClockStore(s => s.countdownResume);
  const cdReset = useClockStore(s => s.countdownReset);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formH, setFormH] = useState(0);
  const [formM, setFormM] = useState(5);
  const [formS, setFormS] = useState(0);
  const [formLoop, setFormLoop] = useState(false);

  const openNew = useCallback(() => {
    setEditId(null);
    setFormName('');
    setFormH(0);
    setFormM(5);
    setFormS(0);
    setFormLoop(false);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((cd: Countdown) => {
    setEditId(cd.id ?? null);
    setFormName(cd.name);
    setFormH(Math.floor(cd.totalSeconds / 3600));
    setFormM(Math.floor((cd.totalSeconds % 3600) / 60));
    setFormS(cd.totalSeconds % 60);
    setFormLoop(cd.isLoop);
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    const totalSeconds = formH * 3600 + formM * 60 + formS;
    if (totalSeconds <= 0) return;
    if (editId != null) {
      await updateCountdown(editId, { name: formName || 'Countdown', totalSeconds, isLoop: formLoop });
    } else {
      await createCountdown({
        name: formName || 'Countdown', totalSeconds, isLoop: formLoop,
        remainingAtPause: null, startTimestamp: null, expectedEndTimestamp: null,
        status: 'idle', soundEnabled: true, soundName: 'beep', volume: 0.7, notes: '',
      });
    }
    setShowForm(false);
  }, [editId, formName, formH, formM, formS, formLoop, createCountdown, updateCountdown]);

  const handlePreset = useCallback((seconds: number) => {
    setFormH(Math.floor(seconds / 3600));
    setFormM(Math.floor((seconds % 3600) / 60));
    setFormS(seconds % 60);
  }, []);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{countdowns.length} {t('countdown')}</span>
        <button onClick={openNew} className="btn btn-ghost text-sm flex items-center gap-1">
          <Plus size={16} /> {t('newCountdown')}
        </button>
      </div>

      {/* New/Edit form */}
      {showForm && (
        <div className="card p-4 animate-slide-down space-y-3">
          <div className="flex items-center gap-2">
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder={t('countdownName')}
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800"
              aria-label={t('countdownName')}
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input type="number" min="0" max="99" value={formH} onChange={e => setFormH(Number(e.target.value))}
                className="w-16 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center bg-white dark:bg-gray-800" aria-label={t('hours')} />
              <span className="text-xs text-gray-500">{t('hours')}</span>
            </div>
            <div className="flex items-center gap-1">
              <input type="number" min="0" max="59" value={formM} onChange={e => setFormM(Number(e.target.value))}
                className="w-16 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center bg-white dark:bg-gray-800" aria-label={t('mins')} />
              <span className="text-xs text-gray-500">{t('mins')}</span>
            </div>
            <div className="flex items-center gap-1">
              <input type="number" min="0" max="59" value={formS} onChange={e => setFormS(Number(e.target.value))}
                className="w-16 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center bg-white dark:bg-gray-800" aria-label={t('secs')} />
              <span className="text-xs text-gray-500">{t('secs')}</span>
            </div>
            <label className="flex items-center gap-1 text-xs text-gray-500 ml-2">
              <input type="checkbox" checked={formLoop} onChange={e => setFormLoop(e.target.checked)} />
              {t('loop')}
            </label>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-gray-400 mr-1 self-center">{t('quickTime')}:</span>
            {PRESETS.map(p => (
              <button key={p.seconds} onClick={() => handlePreset(p.seconds)}
                className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                {t(p.labelKey)}
              </button>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="btn btn-ghost text-sm">{t('cancel')}</button>
            <button onClick={handleSubmit} className="btn btn-primary text-sm">{editId != null ? t('save') : t('createBtn2')}</button>
          </div>
        </div>
      )}

      {/* Countdown cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {countdowns.map(cd => {
          const remaining = cd.id != null ? (displays[cd.id] ?? cd.totalSeconds) : cd.totalSeconds;
          const progress = cd.totalSeconds > 0 ? (remaining / cd.totalSeconds) * 100 : 0;
          const status = cd.status as CountdownStatus;
          const isActive = status === 'running' || status === 'paused';

          return (
            <div key={cd.id} className={`card p-4 group ${
              status === 'completed' ? 'border-green-300 dark:border-green-700 bg-green-50/30 dark:bg-green-900/10' : ''
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{cd.name || t('countdown')}</span>
                    {cd.isLoop && <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{t('loop')}</span>}
                  </div>
                  <div className={`text-3xl font-mono font-bold tabular-nums mt-1 ${
                    status === 'completed' ? 'text-green-600 dark:text-green-400' :
                    remaining < 60 ? 'text-red-500' : ''
                  }`}>
                    {status === 'completed' ? '00:00' : formatCountdown(remaining)}
                  </div>
                  {isActive && cd.expectedEndTimestamp && (
                    <div className="text-xs text-gray-400 mt-0.5">{t('endedAt')}: {new Date(cd.expectedEndTimestamp).toLocaleTimeString()}</div>
                  )}
                  {status === 'completed' && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">{t('complete')} ✓</div>
                  )}
                  {/* Progress bar */}
                  {isActive && (
                    <div className="mt-2 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        remaining < 60 ? 'bg-red-500' : remaining < 300 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  <button onClick={() => openEdit(cd)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" aria-label={t('editBtn')}>
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => cd.id != null && deleteCountdown(cd.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-400" aria-label={t('delete')}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex items-center gap-1.5 mt-3">
                {status === 'idle' && (
                  <button onClick={() => cd.id != null && cdStart(cd.id)} className="btn btn-primary text-xs py-1 px-3 flex items-center gap-1">
                    <Play size={13} /> {t('start')}
                  </button>
                )}
                {status === 'running' && (
                  <button onClick={() => cd.id != null && cdPause(cd.id)} className="btn text-xs py-1 px-3 bg-yellow-500 text-white hover:bg-yellow-600 flex items-center gap-1">
                    <Pause size={13} /> {t('pause')}
                  </button>
                )}
                {status === 'paused' && (
                  <>
                    <button onClick={() => cd.id != null && cdResume(cd.id)} className="btn btn-primary text-xs py-1 px-3 flex items-center gap-1">
                      <Play size={13} /> {t('resume')}
                    </button>
                    <button onClick={() => cd.id != null && cdReset(cd.id)} className="btn btn-ghost text-xs py-1 px-2">
                      <RotateCcw size={13} />
                    </button>
                  </>
                )}
                {status === 'completed' && (
                  <button onClick={() => cd.id != null && cdReset(cd.id)} className="btn btn-ghost text-xs py-1 px-3 flex items-center gap-1">
                    <RotateCcw size={13} /> {t('reset')}
                  </button>
                )}
                {/* Quick adjust for active countdowns */}
                {isActive && (
                  <>
                    <button onClick={() => cd.id != null && updateCountdown(cd.id, { remainingAtPause: Math.max(1, remaining + 60), totalSeconds: cd.totalSeconds + 60 })}
                      className="btn btn-ghost text-xs py-1 px-1.5" aria-label={t('addTime')} title={t('addTime')}>
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={() => cd.id != null && updateCountdown(cd.id, { remainingAtPause: Math.max(1, remaining - 60), totalSeconds: Math.max(1, cd.totalSeconds - 60) })}
                      className="btn btn-ghost text-xs py-1 px-1.5" aria-label={t('reduceTime')} title={t('reduceTime')}>
                      <ChevronDown size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {countdowns.length === 0 && !showForm && (
        <div className="text-center text-gray-400 py-12">{t('noCountdowns')}</div>
      )}
    </div>
  );
}
