import { Solar, Lunar } from 'lunar-typescript';
import type { CalendarMode, CountryCode, CalendarMarker, Task } from './types';
import { HOLIDAYS } from './holiday-data';

// Re-export for convenience
export type { CalendarMode };

// --- Date helpers ---

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayKey(): string {
  const d = new Date();
  return formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// --- Lunar calendar conversion ---

export interface LunarInfo {
  month: number;
  day: number;
  isLeapMonth: boolean;
  monthName: string;
  dayName: string;
  yearName: string;
  festival?: string;
  solarTerm?: string;
}

export function solarToLunar(solarDate: string): LunarInfo | null {
  try {
    const [y, m, d] = solarDate.split('-').map(Number);
    const solar = Solar.fromYmd(y, m, d);
    const lunar = solar.getLunar();
    const festivals = lunar.getFestivals();
    return {
      month: lunar.getMonth(),
      day: lunar.getDay(),
      isLeapMonth: lunar.getMonth() < 0, // lunar-typescript uses negative for leap month
      monthName: lunar.getMonthInChinese(),
      dayName: lunar.getDayInChinese(),
      yearName: lunar.getYearInChinese(),
      festival: festivals.length > 0 ? festivals[0] : undefined,
      solarTerm: lunar.getJieQi() || undefined,
    };
  } catch {
    return null;
  }
}

export function lunarMonthDay(solarDate: string): string {
  const info = solarToLunar(solarDate);
  if (!info) return '';
  return `${info.monthName}月${info.dayName}`;
}

// --- Get holidays for a specific date ---

export interface DateHoliday {
  name: string;
  color: string;
  country: CountryCode;
}

export function getHolidaysForDate(
  solarDate: string,
  country: CountryCode
): DateHoliday[] {
  const [y, m, d] = solarDate.split('-').map(Number);
  const defs = HOLIDAYS[country] || [];
  const results: DateHoliday[] = [];

  for (const def of defs) {
    if (def.isLunar) {
      // Convert lunar holiday to solar date for this year
      try {
        const lunar = Lunar.fromYmd(y, def.month, def.day);
        const solar = lunar.getSolar();
        if (solar.getMonth() === m && solar.getDay() === d) {
          results.push({ name: def.name, color: def.color, country });
        }
      } catch {
        // Skip invalid lunar dates
      }
    } else {
      // Direct solar date match
      if (def.month === m && def.day === d) {
        results.push({ name: def.name, color: def.color, country });
      }
    }
  }

  return results;
}

// --- All holidays visible across all countries for a date ---

export function getAllHolidaysForDate(solarDate: string): DateHoliday[] {
  const countries: CountryCode[] = ['CN', 'US', 'JP', 'KR', 'GB'];
  const results: DateHoliday[] = [];
  for (const country of countries) {
    results.push(...getHolidaysForDate(solarDate, country));
  }
  return results;
}

// --- Calendar grid generation ---

export interface CalendarDay {
  dateKey: string;
  solarDay: number;
  lunarText: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  holidays: DateHoliday[];
  markers: CalendarMarker[];
  tasks: Task[];            // 该日期截止的任务
  solarTerm?: string;
}

function getHolidaysForCountries(date: string, countries: Set<CountryCode>): DateHoliday[] {
  const results: DateHoliday[] = [];
  const seen = new Set<string>();
  for (const c of countries) {
    for (const h of getHolidaysForDate(date, c)) {
      if (!seen.has(h.name)) { seen.add(h.name); results.push(h); }
    }
  }
  return results;
}

export function generateCalendarMonth(
  year: number,
  month: number,
  mode: CalendarMode,
  selectedCountries: Set<CountryCode>,
  getMarkersForDate: (date: string) => CalendarMarker[],
  allTasks: Task[]
): CalendarDay[][] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = todayKey();

  // Calculate grid: 6 rows x 7 columns
  const weeks: CalendarDay[][] = [];
  let currentWeek: CalendarDay[] = [];

  // Previous month padding
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevDays = getDaysInMonth(prevYear, prevMonth);

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevDays - i;
    const dateKey = formatDateKey(prevYear, prevMonth, d);
    const lunarInfo = solarToLunar(dateKey);
    const dayTasks = allTasks.filter((t) => !t.completedAt && t.dueDate === dateKey);
    currentWeek.push({
      dateKey,
      solarDay: d,
      lunarText: mode === 'lunar' ? (lunarInfo ? `${lunarInfo.monthName}月${lunarInfo.dayName}` : '') : '',
      isToday: dateKey === today,
      isCurrentMonth: false,
      isWeekend: false,
      holidays: mode === 'solar' ? getHolidaysForCountries(dateKey, selectedCountries) : [],
      markers: getMarkersForDate(dateKey),
      tasks: dayTasks,
      solarTerm: lunarInfo?.solarTerm,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = formatDateKey(year, month, d);
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    const lunarInfo = solarToLunar(dateKey);
    const dayTasks = allTasks.filter((t) => !t.completedAt && t.dueDate === dateKey);

    currentWeek.push({
      dateKey,
      solarDay: d,
      lunarText: mode === 'lunar' ? (lunarInfo ? `${lunarInfo.monthName}月${lunarInfo.dayName}` : '') : '',
      isToday: dateKey === today,
      isCurrentMonth: true,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      holidays: mode === 'solar' ? getHolidaysForCountries(dateKey, selectedCountries) : [],
      markers: getMarkersForDate(dateKey),
      tasks: dayTasks,
      solarTerm: lunarInfo?.solarTerm,
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Next month padding
  const remainingDays = 7 - currentWeek.length;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  for (let d = 1; d <= remainingDays; d++) {
    const dateKey = formatDateKey(nextYear, nextMonth, d);
    const lunarInfo = solarToLunar(dateKey);
    const dayTasks = allTasks.filter((t) => !t.completedAt && t.dueDate === dateKey);
    currentWeek.push({
      dateKey,
      solarDay: d,
      lunarText: mode === 'lunar' ? (lunarInfo ? `${lunarInfo.monthName}月${lunarInfo.dayName}` : '') : '',
      isToday: dateKey === today,
      isCurrentMonth: false,
      isWeekend: false,
      holidays: mode === 'solar' ? getHolidaysForCountries(dateKey, selectedCountries) : [],
      markers: getMarkersForDate(dateKey),
      tasks: dayTasks,
      solarTerm: lunarInfo?.solarTerm,
    });
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

// --- Calendar navigation ---

export function getMonthYearLabel(year: number, month: number): string {
  return `${year}年 ${month}月`;
}

export function prevMonth(year: number, month: number): [number, number] {
  if (month === 1) return [year - 1, 12];
  return [year, month - 1];
}

export function nextMonth(year: number, month: number): [number, number] {
  if (month === 12) return [year + 1, 1];
  return [year, month + 1];
}
