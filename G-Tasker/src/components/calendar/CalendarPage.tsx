import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalendarStore } from '../../stores/calendar-store';
import { useTaskStore } from '../../stores/task-store';
import { shouldShowLunar, useT, useCalendarCountry } from '../../lib/i18n';
import { CalendarGrid } from './CalendarGrid';
import { MarkerDialog } from './MarkerDialog';
import {
  generateCalendarMonth,
  prevMonth,
  nextMonth,
  getMonthYearLabel,
} from '../../lib/calendar-utils';
import { getCountryName } from '../../lib/i18n';
import { COUNTRY_NAMES } from '../../lib/holiday-data';
import type { CalendarMode, CountryCode, CalendarMarker } from '../../lib/types';
import { ChevronLeft, ChevronRight, Sun, MoonStar } from 'lucide-react';

export function CalendarPage() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [mode, setMode] = useState<CalendarMode>('solar');

  const markers = useCalendarStore((s) => s.markers);
  // ✅ 使用 React Context 替代 Zustand 获取日历国家
  const { calendarCountry: defaultCountry, setCalendarCountry: setDefaultCountry } = useCalendarCountry();
  // ✅ 多选国家
  const [selectedCountries, setSelectedCountries] = useState<Set<CountryCode>>(() => new Set([defaultCountry]));
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const toggleCountry = (code: CountryCode) => {
    const next = new Set(selectedCountries);
    if (next.has(code)) { if (next.size > 1) next.delete(code); }
    else next.add(code);
    setSelectedCountries(next);
    setDefaultCountry(code);
  };

  // ✅ 获取当前农历显示状态：只要有一个选中了使用农历的国家就显示
  const showLunarToggle = useMemo(() => {
    return [...selectedCountries].some(c => shouldShowLunar(c));
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

  // Year/month picker
  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  useEffect(() => {
    loadMarkers();
    loadAllTasks();
  }, []); // ✅ 仅挂载时加载

  // ✅ 用 useMemo 派生日历数据（包含任务截止日期）
  const weeks = useMemo(
    () =>
      generateCalendarMonth(year, month, mode, selectedCountries, getMarkersForDate, allTasks),
    [year, month, mode, selectedCountries, markers, allTasks]
  );

  const goToPrevMonth = useCallback(() => {
    const [py, pm] = prevMonth(year, month);
    setYear(py);
    setMonth(pm);
  }, [year, month]);

  const goToNextMonth = useCallback(() => {
    const [ny, nm] = nextMonth(year, month);
    setYear(ny);
    setMonth(nm);
  }, [year, month]);

  const goToToday = useCallback(() => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth() + 1);
  }, []);

  // ✅ 点击日期数字 → 直接新建标记
  const handleAddMarker = useCallback((dateKey: string) => {
    setDialogDate(dateKey);
    setEditingMarker(null);
    setDialogOpen(true);
  }, []);

  // ✅ 点击已有标记 → 编辑该标记
  const handleEditMarker = useCallback((markerId: number) => {
    const marker = markers.find(m => m.id === markerId);
    if (marker) {
      setDialogDate(marker.date);
      setEditingMarker(marker);
      setDialogOpen(true);
    }
  }, [markers]);

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
    [editingMarker, dialogDate, addMarker, updateMarker]
  );

  const handleDeleteMarker = useCallback(async () => {
    if (editingMarker) {
      await deleteMarker(editingMarker.id!);
    }
    setDialogOpen(false);
    setEditingMarker(null);
  }, [editingMarker, deleteMarker]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header: month navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => { setPickerYear(year); setShowPicker(!showPicker); }}
            className="text-xl font-bold text-gray-800 min-w-[140px] text-center hover:text-blue-500 transition-colors"
          >
            {getMonthYearLabel(year, month)}
          </button>

          {/* Year/Month Picker Popup */}
          {showPicker && (
            <div className="absolute top-12 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-72 animate-modal-in">
              {/* Year selector */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setPickerYear(pickerYear - 1)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronLeft size={16} /></button>
                <span className="text-sm font-bold text-gray-800">{pickerYear}</span>
                <button onClick={() => setPickerYear(pickerYear + 1)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronRight size={16} /></button>
              </div>
              {/* Month grid */}
              <div className="grid grid-cols-4 gap-2">
                {MONTHS.map((m, i) => (
                  <button key={m} onClick={() => { setMonth(i + 1); setYear(pickerYear); setShowPicker(false); }}
                    className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                      month === i + 1 && year === pickerYear ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={goToNextMonth}
            className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={goToToday}
            className="ml-2 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {t('todayBtn')}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Calendar mode toggle — 非农历国家不显示 */}
          {showLunarToggle && (
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setMode('solar')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'solar'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sun size={14} />
              {t('solar')}
            </button>
            <button
              onClick={() => setMode('lunar')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'lunar'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MoonStar size={14} />
              {t('lunar')}
            </button>
          </div>
          )}

          {/* Country multi-select */}
          <div className="relative">
            <button
              onClick={() => setShowCountryPicker(!showCountryPicker)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
            >
              🌍 {selectedCountries.size}个国家
            </button>
            {showCountryPicker && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-30 w-52 max-h-64 overflow-y-auto animate-scale-in">
                {(Object.keys(COUNTRY_NAMES) as CountryCode[]).map((code) => (
                  <label key={code} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedCountries.has(code)}
                      onChange={() => toggleCountry(code)}
                      className="w-3.5 h-3.5 rounded accent-blue-500"
                    />
                    <span className="text-gray-700">{getCountryName(code, lang)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <CalendarGrid weeks={weeks} mode={mode} showSolarTerm={selectedCountries.has('CN')} onAddMarker={handleAddMarker} onEditMarker={handleEditMarker} onEditTask={(id) => navigate(`/app/task/${id}`)} />

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
      />
    </div>
  );
}
