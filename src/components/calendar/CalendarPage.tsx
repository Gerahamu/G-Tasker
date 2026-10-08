import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalendarStore } from '../../stores/calendar-store';
import { useTaskStore } from '../../stores/task-store';
import { useUIStore } from '../../stores/ui-store';
import { localeFor, shouldShowLunar, useT, useCalendarCountry } from '../../lib/i18n';
import { CalendarGrid } from './CalendarGrid';
import { MarkerDialog } from './MarkerDialog';
import { TimeMarkDialog } from './TimeMarkDialog';
import { db } from '../../db/database';
import { generateCalendarMonth, prevMonth, nextMonth } from '../../lib/calendar-utils';
import { getCountryName } from '../../lib/i18n';
import { COUNTRY_NAMES } from '../../lib/holiday-data';
import type { CalendarMode, CountryCode, CalendarMarker, TimeMark } from '../../lib/types';
import { ChevronLeft, ChevronRight, ChevronDown, Sun, MoonStar } from 'lucide-react';

export function CalendarPage() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const setCreateTaskRequest = useUIStore((s) => s.setCreateTaskRequest);
  const setShowCreateModal = useUIStore((s) => s.setShowCreateModal);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [mode, setMode] = useState<CalendarMode>('solar');
  const [timeMarks, setTimeMarks] = useState<TimeMark[]>([]);
  const [timeMarkDate, setTimeMarkDate] = useState('');
  const [editingTimeMark, setEditingTimeMark] = useState<TimeMark | null>(null);

  const markers = useCalendarStore((s) => s.markers);
  // ✅ 使用 React Context 替代 Zustand 获取日历国家
  const { calendarCountry: defaultCountry, setCalendarCountry: setDefaultCountry } =
    useCalendarCountry();
  // ✅ 多选国家
  const [selectedCountries, setSelectedCountries] = useState<Set<CountryCode>>(
    () => new Set([defaultCountry]),
  );
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const countryButtonLabel = useMemo(() => {
    const codes = Array.from(selectedCountries);
    if (codes.length === 0) return t('selectedCountries', { n: 0 });
    const firstCountry = getCountryName(codes[0], lang);
    if (codes.length === 1) return firstCountry;
    return `${firstCountry} +${codes.length - 1}`;
  }, [selectedCountries, lang, t]);

  const toggleCountry = (code: CountryCode) => {
    const next = new Set(selectedCountries);
    if (next.has(code)) {
      if (next.size > 1) next.delete(code);
    } else next.add(code);
    setSelectedCountries(next);
    setDefaultCountry(code);
  };

  // ✅ 获取当前农历显示状态：只要有一个选中了使用农历的国家就显示
  const showLunarToggle = useMemo(() => {
    return [...selectedCountries].some((c) => shouldShowLunar(c));
  }, [selectedCountries]);

  const loadMarkers = useCalendarStore((s) => s.loadMarkers);
  const getMarkersForDate = useCalendarStore((s) => s.getMarkersForDate);
  const addMarker = useCalendarStore((s) => s.addMarker);
  const updateMarker = useCalendarStore((s) => s.updateMarker);
  const deleteMarker = useCalendarStore((s) => s.deleteMarker);

  // ✅ 订阅任务数据，用于在日历上显示截止日期
  const allTasks = useTaskStore((s) => s.tasks);
  const loadAllTasks = useTaskStore((s) => s.loadAllTasks);

  // Marker dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState('');
  const [editingMarker, setEditingMarker] = useState<CalendarMarker | null>(null);
  useEffect(() => {
    db.timeMarks.toArray().then(setTimeMarks);
  }, []);
  const saveTimeMark = async (input: Omit<TimeMark, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const shouldCloseDateDetail = dialogOpen && !editingTimeMark;
    if (editingTimeMark?.id) {
      await db.timeMarks.update(editingTimeMark.id, { ...input, updatedAt: now });
      setTimeMarks((marks) =>
        marks.map((mark) =>
          mark.id === editingTimeMark.id ? { ...mark, ...input, updatedAt: now } : mark,
        ),
      );
    } else {
      const id = await db.timeMarks.add({ ...input, createdAt: now, updatedAt: now });
      setTimeMarks((marks) => [...marks, { ...input, id, createdAt: now, updatedAt: now }]);
    }
    setTimeMarkDate('');
    setEditingTimeMark(null);
    if (shouldCloseDateDetail) setDialogOpen(false);
  };
  const deleteTimeMark = async () => {
    if (!editingTimeMark?.id) return;
    await db.timeMarks.delete(editingTimeMark.id);
    setTimeMarks((marks) => marks.filter((mark) => mark.id !== editingTimeMark.id));
    setTimeMarkDate('');
    setEditingTimeMark(null);
  };

  // Year/month picker
  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
  const MONTHS = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ] as const;
  const monthYearLabel = new Intl.DateTimeFormat(localeFor(lang), {
    year: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1, 1));

  useEffect(() => {
    loadMarkers();
    loadAllTasks();
  }, []); // ✅ 仅挂载时加载

  // ✅ 用 useMemo 派生日历数据（包含任务截止日期）
  const weeks = useMemo(
    () => generateCalendarMonth(year, month, mode, selectedCountries, getMarkersForDate, allTasks),
    [year, month, mode, selectedCountries, markers, allTasks],
  );

  const goToPrevMonth = () => {
    const [py, pm] = prevMonth(year, month);
    setYear(py);
    setMonth(pm);
  };

  const goToNextMonth = () => {
    const [ny, nm] = nextMonth(year, month);
    setYear(ny);
    setMonth(nm);
  };

  const goToToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth() + 1);
  };

  // ✅ 点击日期数字 → 直接新建标记
  const handleAddTask = useCallback((dateKey: string) => {
    setCreateTaskRequest({ initialDate: dateKey });
    setShowCreateModal(true);
  }, [setCreateTaskRequest, setShowCreateModal]);

  const handleAddMarker = useCallback((dateKey: string) => {
    setDialogDate(dateKey);
    setEditingMarker(null);
    setDialogOpen(true);
  }, []);

  // ✅ 点击已有标记 → 编辑该标记
  const handleEditMarker = useCallback(
    (markerId: number) => {
      const marker = markers.find((m) => m.id === markerId);
      if (marker) {
        setDialogDate(marker.date);
        setEditingMarker(marker);
        setDialogOpen(true);
      }
    },
    [markers],
  );

  const handleSaveMarker = useCallback(
    async (data: { title: string; type: 'annual' | 'once'; color: string }) => {
      if (editingMarker) {
        await updateMarker(editingMarker.id!, data);
      } else {
        await addMarker({ date: dialogDate, ...data });
      }
      setDialogOpen(false);
      setEditingMarker(null);
    },
    [editingMarker, dialogDate, addMarker, updateMarker],
  );

  const handleDeleteMarker = useCallback(async () => {
    if (editingMarker) {
      await deleteMarker(editingMarker.id!);
    }
    setDialogOpen(false);
    setEditingMarker(null);
  }, [editingMarker, deleteMarker]);

  return (
    <div className="calendar-page">
      {/* Header: month navigation */}
      <div className="calendar-toolbar">
        <div className="calendar-navigation">
          <button
            onClick={goToPrevMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-black/[0.04] active:bg-black/[0.07] transition-colors"
            aria-label={t('previousMonth')}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => {
              setPickerYear(year);
              setShowPicker(!showPicker);
            }}
            className="calendar-month-title"
          >
            {monthYearLabel}
          </button>

          {/* Year/Month Picker Popup */}
          {showPicker && (
            <div className="floating-panel absolute top-12 left-0 z-30 p-4 w-72 rounded-[16px] bg-white/95 backdrop-blur-xl border border-black/[0.06] shadow-[0_12px_40px_rgba(0,0,0,0.09)] animate-modal-in">
              {/* Year selector */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setPickerYear(pickerYear - 1)}
                  aria-label={t('previousYear')}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/[0.05] text-gray-600 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-semibold text-gray-800">{pickerYear}</span>
                <button
                  onClick={() => setPickerYear(pickerYear + 1)}
                  aria-label={t('nextYear')}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/[0.05] text-gray-600 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              {/* Month grid */}
              <div className="grid grid-cols-4 gap-2">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMonth(i + 1);
                      setYear(pickerYear);
                      setShowPicker(false);
                    }}
                    className={`py-2 rounded-[8px] text-xs font-medium transition-colors ${
                      month === i + 1 && year === pickerYear
                        ? 'bg-[#20222a] text-white shadow-xs'
                        : 'text-gray-600 hover:bg-black/[0.04]'
                    }`}
                  >
                    {t(m)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={goToNextMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-black/[0.04] active:bg-black/[0.07] transition-colors"
            aria-label={t('nextMonth')}
          >
            <ChevronRight size={18} />
          </button>
          <button onClick={goToToday} className="calendar-today">
            {t('todayBtn')}
          </button>
        </div>

        <div className="calendar-options">
          {/* Calendar mode toggle — 非农历国家不显示 */}
          {showLunarToggle && (
            <div className="flex items-center h-[31px] bg-black/[0.04] rounded-[10px] p-[2.5px] text-xs font-medium">
              <button
                onClick={() => setMode('solar')}
                aria-pressed={mode === 'solar'}
                className={`flex items-center gap-1.5 h-full px-2.5 rounded-[8px] transition-all text-xs ${
                  mode === 'solar'
                    ? 'bg-white text-gray-800 shadow-[0_1px_3px_rgba(0,0,0,0.06)] font-medium'
                    : 'text-gray-500/80 hover:text-gray-700 font-normal'
                }`}
              >
                <Sun size={13} className={mode === 'solar' ? 'text-gray-700' : 'text-gray-400'} />
                <span>{t('solar')}</span>
              </button>
              <button
                onClick={() => setMode('lunar')}
                aria-pressed={mode === 'lunar'}
                className={`flex items-center gap-1.5 h-full px-2.5 rounded-[8px] transition-all text-xs ${
                  mode === 'lunar'
                    ? 'bg-white text-gray-800 shadow-[0_1px_3px_rgba(0,0,0,0.06)] font-medium'
                    : 'text-gray-500/80 hover:text-gray-700 font-normal'
                }`}
              >
                <MoonStar
                  size={13}
                  className={mode === 'lunar' ? 'text-gray-700' : 'text-gray-400'}
                />
                <span>{t('lunar')}</span>
              </button>
            </div>
          )}

          {/* Country multi-select */}
          <div className="relative">
            <button
              onClick={() => setShowCountryPicker(!showCountryPicker)}
              aria-label={t('selectedCountries', { n: selectedCountries.size })}
              className="h-[31px] px-3 rounded-[10px] bg-white/60 hover:bg-white/90 border border-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.02)] text-[12.5px] font-medium text-gray-700 hover:text-gray-900 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>🌎</span>
              <span>{countryButtonLabel}</span>
              <ChevronDown size={13} className="text-gray-400 ml-0.5" />
            </button>
            {showCountryPicker && (
              <div className="floating-panel absolute right-0 top-full mt-1.5 p-2 z-30 w-52 max-h-64 overflow-y-auto rounded-[14px] bg-white/95 backdrop-blur-xl border border-black/[0.06] shadow-[0_12px_40px_rgba(0,0,0,0.09)] animate-scale-in">
                {(Object.keys(COUNTRY_NAMES) as CountryCode[]).map((code) => (
                  <label
                    key={code}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] hover:bg-black/[0.04] cursor-pointer text-xs font-medium text-gray-700 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCountries.has(code)}
                      onChange={() => toggleCountry(code)}
                      className="w-3.5 h-3.5 rounded accent-[#20222a]"
                    />
                    <span>{getCountryName(code, lang)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <CalendarGrid
        weeks={weeks}
        mode={mode}
        showSolarTerm={selectedCountries.has('CN')}
        onAddMarker={handleAddMarker}
        onAddTask={handleAddTask}
        onEditMarker={handleEditMarker}
        onEditTask={(id) => navigate(`/app/task/${id}`)}
        timeMarks={timeMarks}
        onEditTimeMark={(mark) => {
          setEditingTimeMark(mark);
          setTimeMarkDate(mark.startDate);
        }}
      />
      {/* Marker dialog */}
      <MarkerDialog
        open={dialogOpen}
        date={dialogDate}
        marker={editingMarker}
        onSave={handleSaveMarker}
        onDelete={handleDeleteMarker}
        onClose={() => {
          setDialogOpen(false);
          setEditingMarker(null);
        }}
        timeMarks={timeMarks.filter(
          (mark) => mark.startDate <= dialogDate && mark.endDate >= dialogDate,
        )}
        onAddTimeMark={() => {
          setTimeMarkDate(dialogDate);
          setEditingTimeMark(null);
        }}
        onEditTimeMark={(mark) => {
          setTimeMarkDate(dialogDate);
          setEditingTimeMark(mark);
        }}
      />
      {timeMarkDate && (
        <TimeMarkDialog
          mark={editingTimeMark}
          date={timeMarkDate}
          onSave={saveTimeMark}
          onDelete={deleteTimeMark}
          onClose={() => {
            setTimeMarkDate('');
            setEditingTimeMark(null);
          }}
        />
      )}
    </div>
  );
}
