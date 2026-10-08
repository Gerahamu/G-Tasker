import { useState, useEffect, useRef } from 'react';
import type { CalendarMarker, TimeMark } from '../../lib/types';
import { lunarMonthDay } from '../../lib/calendar-utils';
import { useT } from '../../lib/i18n';

const MARKER_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

interface MarkerDialogProps {
  open: boolean;
  date: string;
  marker: CalendarMarker | null;
  onSave: (data: { title: string; type: 'annual' | 'once'; color: string }) => void;
  onDelete: () => void;
  onClose: () => void;
  timeMarks?: TimeMark[];
  onAddTimeMark?: () => void;
  onEditTimeMark?: (mark: TimeMark) => void;
}

export function MarkerDialog({ open, date, marker, onSave, onDelete, onClose, timeMarks = [], onAddTimeMark, onEditTimeMark }: MarkerDialogProps) {
  const { t } = useT();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'annual' | 'once'>('once');
  const [color, setColor] = useState(MARKER_COLORS[0]);
  const isComposingRef = useRef(false);

  useEffect(() => {
    if (!isComposingRef.current) {
      if (marker) {
        setTitle(marker.title);
        setType(marker.type);
        setColor(marker.color);
      } else {
        setTitle('');
        setType('once');
        setColor(MARKER_COLORS[0]);
      }
    }
  }, [marker, open]);

  if (!open) return null;

  const lunarText = lunarMonthDay(date);
  const dateLabel = `${date}${lunarText ? ` (${t('lunarPrefix')} ${lunarText})` : ''}`;

  const handleSubmit = () => {
    if (title.trim()) {
      onSave({ title: title.trim(), type, color });
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div
        className="modal-panel p-6 max-w-sm animate-modal-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="marker-dialog-title"
      >
        <h3 id="marker-dialog-title" className="text-lg font-semibold text-gray-800 mb-1">
          {marker ? t('editMarker') : t('addDateMarker')}
        </h3>
        <p className="text-xs text-gray-500 mb-4">{dateLabel}</p>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('markerName')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onCompositionStart={() => { isComposingRef.current = true; }}
            onCompositionEnd={() => { isComposingRef.current = false; }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if ((e.nativeEvent as { isComposing?: boolean }).isComposing || isComposingRef.current) return;
                handleSubmit();
              }
            }}
            placeholder={t('markerNamePlaceholder')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoFocus
          />
        </div>

        {/* Type */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('repeatType')}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setType('once')}
              aria-pressed={type === 'once'}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                type === 'once'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              📅 {t('onceOnly')}
            </button>
            <button
              onClick={() => setType('annual')}
              aria-pressed={type === 'annual'}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                type === 'annual'
                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              🔄 {t('annualRepeat')}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {type === 'annual'
              ? t('annualDesc')
              : t('onceDesc')}
          </p>
        </div>

        {/* Color */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('markerColor')}</label>
          <div className="flex gap-1.5">
            {MARKER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={t('tagColorChoice', { color: c })}
                aria-pressed={color === c}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-offset-1 ring-blue-400 scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <section className="border-t border-gray-100 pt-4 mb-5">
          <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-semibold text-gray-700">时间标注</h4><button type="button" onClick={onAddTimeMark} className="text-xs text-blue-600 hover:text-blue-700">+ 添加时间标注</button></div>
          {timeMarks.map((timeMark) => <button type="button" key={timeMark.id} onClick={() => onEditTimeMark?.(timeMark)} className="w-full text-left px-3 py-2 mb-1 rounded-lg border border-gray-100 hover:bg-gray-50" style={{ borderLeftColor: timeMark.color, borderLeftWidth: 3 }}><div className="text-sm font-medium text-gray-700">{timeMark.title}</div><div className="text-xs text-gray-400">{timeMark.startDate} — {timeMark.endDate}</div></button>)}
        </section>
        <div className="flex items-center justify-between">
          <div>
            {marker && (
              <button
                onClick={onDelete}
                className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                🗑 {t('deleteBtn')}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              {t('cancelBtn')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="btn btn-primary"
            >
              {t('saveBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
