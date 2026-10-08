import { todayISO } from './format-date';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class TaskDateValidationError extends Error {}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = DATE_PATTERN.exec(value);
  if (!match) throw new TaskDateValidationError('Invalid calendar date');
  const [, year, month, day] = match;
  const candidate = new Date(Number(year), Number(month) - 1, Number(day));
  if (todayISO(candidate) !== value) throw new TaskDateValidationError('Invalid calendar date');
  return value;
}

function normalizeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const compact = value.slice(0, 5);
  if (!TIME_PATTERN.test(compact)) throw new TaskDateValidationError('Invalid local time');
  return compact;
}

function normalizeDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const [date, time, ...rest] = value.split('T');
  if (rest.length > 0) throw new TaskDateValidationError('Invalid local date-time');
  const normalizedDate = normalizeDate(date);
  const normalizedTime = normalizeTime(time);
  return normalizedDate ? `${normalizedDate}${normalizedTime ? `T${normalizedTime}` : ''}` : null;
}

function boundary(value: string, end: boolean): number {
  const [date, time] = value.split('T');
  return new Date(`${date}T${time ?? (end ? '23:59' : '00:00')}`).getTime();
}

export function normalizeTaskDates(input: {
  dateMode: 'simple' | 'advanced';
  dueDate?: string | null;
  dueTime?: string | null;
  dateStart?: string | null;
  dateEnd?: string | null;
}) {
  if (input.dateMode === 'simple') {
    const dueDate = normalizeDate(input.dueDate);
    return {
      dateMode: 'simple' as const,
      dueDate,
      dueTime: dueDate ? normalizeTime(input.dueTime) : null,
      dateStart: null,
      dateEnd: null,
    };
  }

  const dateStart = normalizeDateTime(input.dateStart);
  const dateEnd = normalizeDateTime(input.dateEnd);
  if (dateStart && dateEnd && boundary(dateStart, false) > boundary(dateEnd, true)) {
    throw new TaskDateValidationError('Task start must not be after task end');
  }
  const [dueDate = null, dueTime = null] = dateEnd?.split('T') ?? [];
  return {
    dateMode: 'advanced' as const,
    dueDate,
    dueTime,
    dateStart,
    dateEnd,
  };
}

export function calendarDayDifference(fromDate: string, toDate: string): number {
  const from = normalizeDate(fromDate)!;
  const to = normalizeDate(toDate)!;
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = to.split('-').map(Number);
  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) /
      86_400_000,
  );
}
