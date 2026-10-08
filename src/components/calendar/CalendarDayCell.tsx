import type { CalendarDay, CalendarMode } from '../../lib/calendar-utils';
import { formatFullDate, useT } from '../../lib/i18n';

interface CalendarDayCellProps {
  day: CalendarDay;
  mode: CalendarMode;
  isFirstCol: boolean;
  showSolarTerm: boolean;
  onAddMarker: () => void;
  onEditMarker: (markerId: number) => void;
  onEditTask: (taskId: number) => void;
  onAddTask: (dateKey: string) => void;
}

export function CalendarDayCell({
  day,
  mode,
  isFirstCol,
  showSolarTerm,
  onAddMarker,
  onEditMarker,
  onEditTask,
  onAddTask,
}: CalendarDayCellProps) {
  const { t, lang } = useT();
  const {
    solarDay,
    lunarText,
    isToday,
    isCurrentMonth,
    isWeekend,
    holidays,
    markers,
    tasks,
    solarTerm,
  } = day;

  const hasMarkers = markers.length > 0;
  const markerColor = hasMarkers ? markers[0].color : undefined;
  const accessibleDate = [
    formatFullDate(new Date(`${day.dateKey}T00:00:00`), lang),
    isToday ? t('dateToday') : '',
    !isCurrentMonth ? t('dateOutsideMonth') : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      onClick={() => onAddTask(day.dateKey)}
      className={`
        relative min-h-[82px] p-2.5 border-r border-black/[0.04] last:border-r-0 transition-colors duration-150
        text-gray-800 cursor-pointer
        ${isToday ? 'bg-black/[0.025]' : 'hover:bg-black/[0.018]'}
        ${hasMarkers && isCurrentMonth ? 'ring-1.5 ring-inset rounded-lg' : ''}
      `}
      style={
        hasMarkers && isCurrentMonth
          ? ({ '--tw-ring-color': markerColor + '40' } as React.CSSProperties)
          : undefined
      }
    >
      {/* Day number — click to add marker */}
      <div className="flex items-center justify-between mb-1.5 h-[26px]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddMarker();
          }}
          data-ui="calendar-date"
          aria-label={accessibleDate}
          aria-current={isToday ? 'date' : undefined}
          className={`
            inline-flex items-center justify-center w-[26px] h-[26px] text-[13.5px] font-medium transition-colors
            ${
              isToday
                ? 'rounded-full bg-[#20222a] text-white shadow-xs'
                : isWeekend && isCurrentMonth
                  ? 'text-[#df5252] rounded-full hover:bg-black/[0.04]'
                  : isFirstCol && isCurrentMonth
                    ? 'text-[#df5252] rounded-full hover:bg-black/[0.04]'
                    : !isCurrentMonth
                      ? 'text-[#252A34] opacity-30 rounded-full'
                      : 'text-[#252A34] rounded-full hover:bg-black/[0.04]'
            }
            ${hasMarkers && !isToday ? 'ring-1.5 ring-offset-1' : ''}
          `}
          style={
            hasMarkers && !isToday
              ? ({ ringColor: markerColor, color: markerColor } as React.CSSProperties)
              : undefined
          }
          title={t('addDateMarker')}
        >
          {solarDay}
        </button>

        {mode === 'lunar' && lunarText && (
          <span
            className={`text-[11px] truncate ml-1 font-normal ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-400'}`}
          >
            {lunarText}
          </span>
        )}
      </div>

      {showSolarTerm && solarTerm && isCurrentMonth && (
        <div className="h-[20px] flex items-center px-1 mb-1">
          <span className="w-[2px] h-[10px] rounded-full bg-emerald-500/80 mr-1.5 flex-shrink-0" />
          <span className="text-[11.5px] font-medium text-emerald-600 leading-none truncate">
            {solarTerm}
          </span>
        </div>
      )}

      {/* Personal markers — clickable to edit */}
      {hasMarkers && isCurrentMonth && (
        <div className="space-y-1 mb-1 relative z-10">
          {markers.slice(0, 2).map((m, i) => (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onEditMarker(m.id!);
              }}
              className="h-[22px] px-2 rounded-[6px] flex items-center gap-1.5 truncate font-medium cursor-pointer hover:opacity-85 transition-opacity"
              style={{ backgroundColor: `${m.color}16`, color: m.color }}
              title={`${m.title}${m.type === 'annual' ? ` (${t('annualMarker')})` : ''} — ${t('clickToEdit')}`}
              role="button"
            >
              <span
                className="w-[2.5px] h-[11px] rounded-full flex-shrink-0"
                style={{ backgroundColor: m.color }}
              />
              <span className="text-[11.5px] font-medium truncate leading-none">{m.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Holidays */}
      {holidays.length > 0 && (
        <div className="space-y-1 mb-1">
          {holidays.slice(0, 2).map((h, i) => (
            <div
              key={i}
              className="h-[22px] px-2 rounded-[6px] flex items-center gap-1.5 truncate cursor-default"
              style={{ backgroundColor: h.color ? `${h.color}14` : 'rgba(239, 68, 68, 0.08)' }}
              title={h.name}
            >
              <span
                className="w-[2.5px] h-[11px] rounded-full flex-shrink-0"
                style={{ backgroundColor: h.color || '#ef4444' }}
              />
              <span
                className="text-[11.5px] font-medium truncate leading-none"
                style={{ color: h.color || '#d94444' }}
              >
                {h.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tasks — clickable to edit */}
      {tasks.length > 0 && isCurrentMonth && (
        <div className="space-y-1 relative z-10">
          {tasks.slice(0, 3).map((t, i) => {
            const isCompleted = Boolean(t.completedAt);
            return (
              <div
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTask(t.id!);
                }}
                className={`h-[22px] px-2 rounded-[6px] flex items-center gap-1.5 cursor-pointer w-full text-left transition-colors duration-150 ${
                  isCompleted
                    ? 'bg-black/[0.035] text-neutral-400 opacity-60 line-through'
                    : 'bg-black/[0.055] hover:bg-black/[0.085] text-[#3a3a3a]'
                }`}
                title={t.title}
                role="button"
                tabIndex={0}
              >
                <span
                  className={`w-[2.5px] h-[11px] rounded-full flex-shrink-0 ${
                    isCompleted ? 'bg-neutral-400' : 'bg-[#20222a]'
                  }`}
                />
                <span className="text-[11.5px] font-medium truncate leading-none flex-1">
                  {t.title}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
