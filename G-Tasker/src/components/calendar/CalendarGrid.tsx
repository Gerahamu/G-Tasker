import { useT } from '../../lib/i18n';
import { CalendarDayCell } from './CalendarDayCell';
import type { CalendarDay, CalendarMode } from '../../lib/calendar-utils';

interface CalendarGridProps {
  weeks: CalendarDay[][];
  mode: CalendarMode;
  showSolarTerm: boolean;
  onAddMarker: (dateKey: string) => void;
  onEditMarker: (markerId: number) => void;
  onEditTask: (taskId: number) => void;
}

export function CalendarGrid({ weeks, mode, showSolarTerm, onAddMarker, onEditMarker, onEditTask }: CalendarGridProps) {
  const { t } = useT();
  const WEEKDAYS = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {WEEKDAYS.map((name, i) => (
          <div
            key={name}
            className={`py-2 text-center text-xs font-semibold ${
              i === 0 || i === 6 ? 'text-red-400' : 'text-gray-500'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar rows */}
      <div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
            {week.map((day, di) => (
              <CalendarDayCell
                key={day.dateKey}
                day={day}
                mode={mode}
                isFirstCol={di === 0}
                showSolarTerm={showSolarTerm}
                onAddMarker={() => onAddMarker(day.dateKey)}
                onEditMarker={onEditMarker}
                onEditTask={onEditTask}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
