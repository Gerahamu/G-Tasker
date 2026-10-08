import { useT } from '../../lib/i18n';
import { CalendarDayCell } from './CalendarDayCell';
import type { CalendarDay, CalendarMode } from '../../lib/calendar-utils';
import type { TimeMark } from '../../lib/types';
import { getTimeMarkSegments } from '../../lib/time-mark-layout';

const TIME_MARK_TOP = 36;
const TIME_MARK_LANE_HEIGHT = 22;
const TIME_MARK_BAR_HEIGHT = 18;

interface CalendarGridProps {
  weeks: CalendarDay[][];
  mode: CalendarMode;
  showSolarTerm: boolean;
  onAddMarker: (dateKey: string) => void;
  onEditMarker: (markerId: number) => void;
  onEditTask: (taskId: number) => void;
  onAddTask: (dateKey: string) => void;
  timeMarks?: TimeMark[];
  onEditTimeMark?: (mark: TimeMark) => void;
}

export function CalendarGrid({
  weeks,
  mode,
  showSolarTerm,
  onAddMarker,
  onEditMarker,
  onEditTask,
  onAddTask,
  timeMarks = [],
  onEditTimeMark,
}: CalendarGridProps) {
  const { t } = useT();
  const WEEKDAYS = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];
  const timeMarkSegments = getTimeMarkSegments(weeks, timeMarks);
  return (
    <div className="calendar-surface">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-black/[0.045] bg-black/[0.012]">
        {WEEKDAYS.map((name, i) => (
          <div
            key={name}
            className={`py-2.5 text-center text-[11.5px] font-medium tracking-tight ${
              i === 0 || i === 6 ? 'text-[#df5252]' : 'text-[#5a6270]'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar rows */}
      <div>
        {weeks.map((week, wi) => {
          const rowSegments = timeMarkSegments.filter(
            (segment) => segment.row === wi && segment.lane < 3,
          );
          return (
            <div
              key={wi}
              className="relative grid grid-cols-7 border-b border-black/[0.04] last:border-b-0"
            >
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
                  onAddTask={onAddTask}
                />
              ))}
              {rowSegments.map((segment) => (
                <button
                  key={`${segment.mark.id}-${segment.lane}`}
                  type="button"
                  onClick={() => onEditTimeMark?.(segment.mark)}
                  className="time-mark-bar absolute box-border flex min-h-[18px] items-center overflow-hidden whitespace-nowrap px-1.5 text-left text-[11px] leading-none text-white"
                  style={{
                    left: `calc(${segment.startColumn} / 7 * 100% + 2px)`,
                    width: `calc(${segment.endColumn - segment.startColumn + 1} / 7 * 100% - 4px)`,
                    top: `${TIME_MARK_TOP + segment.lane * TIME_MARK_LANE_HEIGHT}px`,
                    height: `${TIME_MARK_BAR_HEIGHT}px`,
                    backgroundColor: segment.mark.color,
                    borderRadius: `${segment.isStart ? '6px' : '0'} ${segment.isEnd ? '6px' : '0'} ${segment.isEnd ? '6px' : '0'} ${segment.isStart ? '6px' : '0'}`,
                  }}
                >
                  {segment.isStart ? segment.mark.title : ''}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
