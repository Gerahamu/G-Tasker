import type { CalendarDay, CalendarMode } from '../../lib/calendar-utils';

interface CalendarDayCellProps {
  day: CalendarDay;
  mode: CalendarMode;
  isFirstCol: boolean;
  showSolarTerm: boolean;
  onAddMarker: () => void;
  onEditMarker: (markerId: number) => void;
  onEditTask: (taskId: number) => void;
}

export function CalendarDayCell({ day, mode, isFirstCol, showSolarTerm, onAddMarker, onEditMarker, onEditTask }: CalendarDayCellProps) {
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

  return (
    <div
      className={`
        relative min-h-[72px] p-1.5 border-r border-gray-100 last:border-r-0
        ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-300' : 'text-gray-800'}
        ${isToday ? 'bg-blue-50/30' : ''}
        ${hasMarkers && isCurrentMonth ? 'ring-2 ring-inset rounded-lg' : ''}
      `}
      style={hasMarkers && isCurrentMonth ? { '--tw-ring-color': markerColor + '40' } as React.CSSProperties : undefined}
    >
      {/* Day number — click to add marker */}
      <div className="flex items-center justify-between mb-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); onAddMarker(); }}
          className={`
            inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full transition-all
            hover:scale-110 hover:shadow
            ${isToday ? 'bg-blue-500 text-white' : ''}
            ${hasMarkers && !isToday ? 'ring-2 ring-offset-1' : ''}
            ${isWeekend && isCurrentMonth && !isToday && !hasMarkers ? 'text-red-400' : ''}
            ${isFirstCol && isCurrentMonth && !isToday && !hasMarkers ? 'text-red-400' : ''}
            ${!isToday && !hasMarkers ? 'hover:bg-blue-100 hover:text-blue-600' : ''}
          `}
          style={hasMarkers && !isToday ? { ringColor: markerColor, color: markerColor } as React.CSSProperties : undefined}
          title="添加标记"
        >
          {solarDay}
        </button>

        {mode === 'lunar' && lunarText && (
          <span className="text-[10px] text-gray-400 truncate ml-1">{lunarText}</span>
        )}
      </div>

      {showSolarTerm && solarTerm && isCurrentMonth && (
        <div className="text-[10px] text-green-600 font-medium leading-tight mb-0.5">{solarTerm}</div>
      )}

      {/* Personal markers — clickable to edit */}
      {hasMarkers && isCurrentMonth && (
        <div className="space-y-0.5 mb-0.5 relative z-10">
          {markers.slice(0, 2).map((m, i) => (
            <div
              key={i}
              onClick={(e) => { e.stopPropagation(); onEditMarker(m.id!); }}
              className="text-[10px] leading-tight px-1 py-0.5 rounded truncate font-medium cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: m.color + '20', color: m.color }}
              title={`${m.title}${m.type === 'annual' ? ' (每年)' : ''} — 点击编辑`}
              role="button">
              {m.type === 'annual' ? '🔄' : '📌'} {m.title}
            </div>
          ))}
        </div>
      )}

      {/* Holidays */}
      <div className="space-y-0.5">
        {holidays.slice(0, 2).map((h, i) => (
          <div key={i} className="text-[10px] leading-tight px-1 py-0.5 rounded truncate"
            style={{ backgroundColor: h.color + '18', color: h.color }} title={h.name}>{h.name}</div>
        ))}
      </div>

      {/* Tasks — clickable to edit */}
      {tasks.length > 0 && isCurrentMonth && (
        <div className="space-y-0.5 mt-0.5 relative z-10">
          {tasks.slice(0, 3).map((t, i) => (
            <div
              key={i}
              onClick={(e) => { e.stopPropagation(); onEditTask(t.id!); }}
              className="text-[10px] leading-tight px-1 py-0.5 rounded truncate bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer w-full font-medium border border-blue-200"
              title={t.title}
              role="button"
              tabIndex={0}>
              {t.priority === 'high' && '❗'}{t.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
