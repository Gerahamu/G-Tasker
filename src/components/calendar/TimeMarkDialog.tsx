import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TimeMark } from '../../lib/types';

const colors = ['#5b5bd6', '#3978d7', '#23966a', '#df6f32', '#d94a64'];
export function TimeMarkDialog({
  mark,
  date,
  onSave,
  onDelete,
  onClose,
}: {
  mark: TimeMark | null;
  date: string;
  onSave: (data: Omit<TimeMark, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(colors[0]);
  const [showOnHome, setShowOnHome] = useState(true);
  useEffect(() => {
    setTitle(mark?.title ?? '');
    setStartDate(mark?.startDate ?? date);
    setEndDate(mark?.endDate ?? date);
    setDescription(mark?.description ?? '');
    setColor(mark?.color ?? colors[0]);
    setShowOnHome(mark?.showOnHome ?? true);
  }, [mark, date]);
  const submit = () => {
    if (title.trim() && endDate >= startDate)
      onSave({
        title: title.trim(),
        startDate,
        endDate,
        description,
        color,
        displayMode: 'bar',
        priority: 0,
        showInMonth: true,
        showOnHome,
      });
  };
  return createPortal(
    <div className="modal-backdrop animate-fade-in" style={{ zIndex: 70 }} onClick={onClose}>
      <div
        className="modal-panel p-6 max-w-sm animate-modal-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="时间标注"
      >
        <h3 className="text-lg font-semibold mb-4">{mark ? '编辑时间标注' : '新建时间标注'}</h3>
        <label className="text-xs">
          标题
          <input
            className="w-full mt-1 mb-3 px-3 py-2 border rounded-lg"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </label>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="text-xs">
            开始日期
            <input
              type="date"
              className="w-full mt-1 px-2 py-2 border rounded-lg"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="text-xs">
            结束日期
            <input
              type="date"
              min={startDate}
              className="w-full mt-1 px-2 py-2 border rounded-lg"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
        <label className="text-xs">
          描述
          <textarea
            className="w-full mt-1 px-3 py-2 border rounded-lg"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="flex gap-2 my-3">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              aria-label="选择颜色"
              aria-pressed={c === color}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <label className="text-sm flex gap-2 mb-4">
          <input
            type="checkbox"
            checked={showOnHome}
            onChange={(e) => setShowOnHome(e.target.checked)}
          />
          显示在首页
        </label>
        <div className="flex justify-between">
          <div>
            {mark && (
              <button type="button" className="text-red-500" onClick={onDelete}>
                删除
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!title.trim() || endDate < startDate}
              onClick={submit}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
