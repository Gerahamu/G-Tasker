import { useEffect, useCallback, useRef } from 'react';
import { useClockStore } from '../../stores/clock-store';
import { useT } from '../../lib/i18n';
import { Play, Pause, RotateCcw, Flag, X } from 'lucide-react';

export function StopwatchPanel() {
  const { t } = useT();
  const sw = useClockStore(s => s.stopwatch);
  const display = useClockStore(s => s.stopwatchDisplay);
  const start = useClockStore(s => s.stopwatchStart);
  const pause = useClockStore(s => s.stopwatchPause);
  const resume = useClockStore(s => s.stopwatchResume);
  const reset = useClockStore(s => s.stopwatchReset);
  const lap = useClockStore(s => s.stopwatchLap);
  const deleteLap = useClockStore(s => s.stopwatchDeleteLap);
  const clearLaps = useClockStore(s => s.stopwatchClearLaps);
  const loadStopwatch = useClockStore(s => s.loadStopwatch);

  const stopwatchAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStopwatch();
  }, [loadStopwatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (sw?.isRunning) pause(); else if ((sw?.accumulatedMs ?? 0) > 0) resume(); else start();
      }
      if (e.code === 'KeyL' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (sw?.isRunning) lap();
      }
      if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sw, start, pause, resume, lap, reset]);

  const handleMainAction = useCallback(() => {
    if (!sw) return;
    if (sw.isRunning) pause();
    else if (sw.accumulatedMs > 0) resume();
    else start();
  }, [sw, start, pause, resume]);

  if (!sw) return null;

  return (
    <div className="max-w-md mx-auto space-y-6" ref={stopwatchAreaRef}>
      {/* Main display */}
      <div className="text-center py-8">
        <div className="text-6xl sm:text-7xl font-mono font-bold tabular-nums tracking-tighter select-none"
          aria-live="polite" aria-label={`Stopwatch: ${display}`}>
          {display}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={reset} className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          aria-label={t('reset')}>
          <RotateCcw size={22} />
        </button>

        <button
          onClick={handleMainAction}
          className={`p-5 rounded-full text-white transition-all transform active:scale-95 ${
            sw.isRunning ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'
          }`}
          aria-label={sw.isRunning ? t('pause') : sw.accumulatedMs > 0 ? t('resume') : t('start')}
        >
          {sw.isRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
        </button>

        <button
          onClick={lap}
          disabled={!sw.isRunning}
          className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t('lapBtn')}
        >
          <Flag size={22} />
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="text-center text-xs text-gray-400 space-x-3">
        <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Space</kbd> {t('start')}/{t('pause')}</span>
        <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">L</kbd> {t('lapBtn')}</span>
        <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">R</kbd> {t('reset')}</span>
      </div>

      {/* Lap list */}
      {sw.laps.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('lapBtn')} ({sw.laps.length})</span>
            <button onClick={clearLaps} className="text-xs text-red-500 hover:text-red-600">{t('clearLaps')}</button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {[...sw.laps].reverse().map(l => (
              <div key={l.lapNumber} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm group">
                <span className="text-gray-400 tabular-nums">#{l.lapNumber}</span>
                <span className="tabular-nums font-mono">{fmtMs(l.lapTime)}</span>
                <span className="tabular-nums font-mono text-gray-400">{fmtMs(l.totalTime)}</span>
                <button onClick={() => deleteLap(l.lapNumber)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-500 transition-opacity"
                  aria-label={`${t('delete')} lap ${l.lapNumber}`}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sw.laps.length === 0 && sw.accumulatedMs === 0 && (
        <div className="text-center text-gray-400 py-4">{t('noLaps')}</div>
      )}
    </div>
  );
}

function fmtMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const cs = Math.floor((ms % 1000) / 10);
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const cc = String(cs).padStart(2, '0');
  if (hours > 0) return `${String(hours).padStart(2, '0')}:${mm}:${ss}.${cc}`;
  return `${mm}:${ss}.${cc}`;
}
