import { useState, useEffect, useMemo, useCallback } from 'react';
import { useClockStore } from '../../stores/clock-store';
import { useT } from '../../lib/i18n';
import { getTimezoneInfo, getTimeDiff, convertTime } from '../../lib/time-utils';
import type { TimeConversionResult } from '../../lib/clock-types';
import { Search, Plus, Star, Trash2, ArrowRightLeft } from 'lucide-react';

const COMMON_TZS = [
  { tz: 'Asia/Shanghai', city: 'Shanghai' },
  { tz: 'Asia/Tokyo', city: 'Tokyo' },
  { tz: 'Asia/Seoul', city: 'Seoul' },
  { tz: 'Asia/Singapore', city: 'Singapore' },
  { tz: 'Asia/Dubai', city: 'Dubai' },
  { tz: 'Asia/Kolkata', city: 'Kolkata' },
  { tz: 'Europe/London', city: 'London' },
  { tz: 'Europe/Paris', city: 'Paris' },
  { tz: 'Europe/Berlin', city: 'Berlin' },
  { tz: 'Europe/Moscow', city: 'Moscow' },
  { tz: 'America/New_York', city: 'New York' },
  { tz: 'America/Chicago', city: 'Chicago' },
  { tz: 'America/Los_Angeles', city: 'Los Angeles' },
  { tz: 'America/Sao_Paulo', city: 'São Paulo' },
  { tz: 'Australia/Sydney', city: 'Sydney' },
  { tz: 'Pacific/Auckland', city: 'Auckland' },
];

export function WorldClockPanel() {
  const { t } = useT();
  const timezones = useClockStore((s) => s.timezones);
  const addTimezone = useClockStore((s) => s.addTimezone);
  const deleteTimezone = useClockStore((s) => s.deleteTimezone);
  const setPrimaryTimezone = useClockStore((s) => s.setPrimaryTimezone);
  const localTz = useClockStore((s) => s.localTz);

  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [convOpen, setConvOpen] = useState(false);
  const [convDate, setConvDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [convTime, setConvTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [convSourceTz] = useState(localTz);
  const [convResults, setConvResults] = useState<TimeConversionResult[]>([]);

  // Update time every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const currentNow = useMemo(() => new Date(now), [now]);

  // Filter search
  const filteredTzs = useMemo(() => {
    if (!search.trim()) return COMMON_TZS;
    const q = search.toLowerCase();
    return COMMON_TZS.filter(
      (t) => t.city.toLowerCase().includes(q) || t.tz.toLowerCase().includes(q),
    );
  }, [search]);

  const handleAdd = useCallback(
    async (tz: string, city: string) => {
      await addTimezone({
        timezone: tz,
        cityName: city,
        customName: '',
        order: 0,
        isPrimary: false,
      });
      setSearch('');
      setShowSearch(false);
    },
    [addTimezone],
  );

  const handleConvert = useCallback(() => {
    if (!convDate || !convTime) return;
    const results: TimeConversionResult[] = timezones.map((tz) => {
      const { date, time, weekday } = convertTime(convDate, convTime, convSourceTz, tz.timezone);
      const diff = getTimeDiff(currentNow, convSourceTz, tz.timezone);
      return {
        timezone: tz.timezone,
        cityName: tz.customName || tz.cityName,
        dateTime: `${date} ${time}`,
        date,
        time,
        weekday,
        utcOffset: '',
        diffFromLocal: diff.label,
        dayLabel: diff.dayLabel,
      };
    });
    setConvResults(results);
  }, [convDate, convTime, convSourceTz, timezones, currentNow]);

  // Current local time info
  const localInfo = getTimezoneInfo(currentNow, localTz);

  return (
    <div className="space-y-4">
      {/* Local time card */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {t('localTime')} · {localTz}
          </div>
          <div className="text-3xl font-bold tabular-nums tracking-tight mt-1">
            {localInfo.time}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">
            {localInfo.date} · {localInfo.weekday} · {localInfo.utcOffset}
          </div>
        </div>
        <div className="text-right text-sm text-gray-400">{currentNow.toLocaleDateString()}</div>
      </div>

      {/* Add timezone */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="btn btn-ghost text-sm flex items-center gap-1"
          aria-label={t('addTimezone')}
        >
          <Plus size={16} /> {t('addTimezone')}
        </button>
        <button
          onClick={() => setConvOpen(!convOpen)}
          className="btn btn-ghost text-sm flex items-center gap-1"
          aria-label={t('timeConverter')}
        >
          <ArrowRightLeft size={16} /> {t('timeConverter')}
        </button>
      </div>

      {/* Search dropdown */}
      {showSearch && (
        <div className="animate-slide-down">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchCity')}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              autoFocus
              aria-label={t('searchCity')}
            />
          </div>
          {search && (
            <div className="mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg max-h-48 overflow-y-auto">
              {filteredTzs.map((t) => (
                <button
                  key={t.tz}
                  onClick={() => handleAdd(t.tz, t.city)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center"
                >
                  <span>{t.city}</span>
                  <span className="text-xs text-gray-400">{t.tz}</span>
                </button>
              ))}
              {filteredTzs.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-400">{t('noResults')}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Time converter */}
      {convOpen && (
        <div className="card p-4 animate-slide-down space-y-3">
          <div className="font-medium text-sm">{t('timeConverter')}</div>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-xs text-gray-500 block">{t('selectDate')}</label>
              <input
                type="date"
                value={convDate}
                onChange={(e) => setConvDate(e.target.value)}
                className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block">{t('selectTime')}</label>
              <input
                type="time"
                value={convTime}
                onChange={(e) => setConvTime(e.target.value)}
                className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800"
              />
            </div>
            <button onClick={handleConvert} className="btn btn-primary text-sm h-[34px]">
              {t('convertBtn')}
            </button>
          </div>
          {convResults.length > 0 && (
            <div className="space-y-1 mt-2">
              {convResults.map((r) => (
                <div
                  key={r.timezone}
                  className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700"
                >
                  <span className="text-gray-500">{r.cityName}</span>
                  <span className="tabular-nums">
                    {r.date} {r.time} <span className="text-xs text-gray-400">({r.weekday})</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timezone cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {timezones.map((tz) => {
          const info = getTimezoneInfo(currentNow, tz.timezone);
          const diff = getTimeDiff(currentNow, localTz, tz.timezone);
          return (
            <div key={tz.id} className="card p-3 relative group">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {tz.isPrimary && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                    <span className="text-xs text-gray-500 truncate">
                      {tz.customName || tz.cityName}
                    </span>
                  </div>
                  <div className="text-2xl font-bold tabular-nums tracking-tight mt-1">
                    {info.time}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {info.date} · {info.weekday}
                  </div>
                  <div className="text-xs text-gray-400">
                    {info.utcOffset} · {t('timeDiff')}: {diff.label}
                  </div>
                  {diff.dayLabel !== 'today' && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mt-1 inline-block">
                      {t(diff.dayLabel)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!tz.isPrimary && (
                    <button
                      onClick={() => tz.id != null && setPrimaryTimezone(tz.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      aria-label={t('setPrimary')}
                    >
                      <Star size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => tz.id != null && deleteTimezone(tz.id)}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-400"
                    aria-label={t('delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {timezones.length === 0 && (
        <div className="text-center text-gray-400 py-12">{t('noSavedTimezones')}</div>
      )}
    </div>
  );
}
