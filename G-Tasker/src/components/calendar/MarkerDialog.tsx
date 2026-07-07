import { useState, useEffect } from 'react';
import type { CalendarMarker } from '../../lib/types';
import { lunarMonthDay } from '../../lib/calendar-utils';

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
}

export function MarkerDialog({ open, date, marker, onSave, onDelete, onClose }: MarkerDialogProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'annual' | 'once'>('once');
  const [color, setColor] = useState(MARKER_COLORS[0]);

  useEffect(() => {
    if (marker) {
      setTitle(marker.title);
      setType(marker.type);
      setColor(marker.color);
    } else {
      setTitle('');
      setType('once');
      setColor(MARKER_COLORS[0]);
    }
  }, [marker, open]);

  if (!open) return null;

  const lunarText = lunarMonthDay(date);
  const dateLabel = `${date}${lunarText ? ` (农历${lunarText})` : ''}`;

  const handleSubmit = () => {
    if (title.trim()) {
      onSave({ title: title.trim(), type, color });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          {marker ? '编辑标记' : '添加日期标记'}
        </h3>
        <p className="text-xs text-gray-500 mb-4">{dateLabel}</p>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">标记名称</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="例如：生日、纪念日..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoFocus
          />
        </div>

        {/* Type */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">重复类型</label>
          <div className="flex gap-2">
            <button
              onClick={() => setType('once')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                type === 'once'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              📅 仅此一次
            </button>
            <button
              onClick={() => setType('annual')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                type === 'annual'
                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              🔄 每年循环
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {type === 'annual'
              ? '每年同月同日都会显示此标记'
              : '仅在此日期显示一次'}
          </p>
        </div>

        {/* Color */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-600 mb-1">标记颜色</label>
          <div className="flex gap-1.5">
            {MARKER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-offset-1 ring-blue-400 scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div>
            {marker && (
              <button
                onClick={onDelete}
                className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                🗑 删除
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
