import { useId, useRef, useState, useEffect } from 'react';
import { CalendarDays, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useT, localeFor } from '../../lib/i18n';
import './date-time-picker.css';

interface Props {
  type: 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
  'aria-label': string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const copy = {
  zh: {
    clear: '清空',
    today: '今天',
    done: '完成',
    hour: '小时',
    minute: '分钟',
    previous: '上个月',
    next: '下个月',
    date: '选择日期',
  },
  en: {
    clear: 'Clear',
    today: 'Today',
    done: 'Done',
    hour: 'Hour',
    minute: 'Minute',
    previous: 'Previous month',
    next: 'Next month',
    date: 'Select date',
  },
  ja: {
    clear: 'クリア',
    today: '今日',
    done: '完了',
    hour: '時',
    minute: '分',
    previous: '前の月',
    next: '次の月',
    date: '日付を選択',
  },
};

export function DateTimePicker({
  type,
  value,
  onChange,
  className,
  autoFocus,
  disabled,
  'aria-label': label,
}: Props) {
  const { lang } = useT();
  const words = copy[lang];
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const selected = value ? new Date(`${value}T12:00:00`) : null;
  const now = new Date();
  const [hour, minute] = (value || `${pad(now.getHours())}:${pad(now.getMinutes())}`).split(':');
  const close = () => {
    panel.current?.hidePopover();
    trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const place = () => {
      if (!trigger.current || !panel.current) return;
      const box = trigger.current.getBoundingClientRect();
      const height = panel.current.offsetHeight;
      const width = panel.current.offsetWidth;
      setPosition({
        left: Math.max(8, Math.min(box.left, window.innerWidth - width - 8)),
        top: Math.max(
          8,
          box.bottom + height + 8 < window.innerHeight ? box.bottom + 8 : box.top - height - 8,
        ),
      });
    };
    place();
    panel.current?.focus({ preventScroll: true });
    panel.current
      ?.querySelectorAll<HTMLElement>('[aria-pressed="true"]')
      .forEach((el) => el.scrollIntoView({ block: 'nearest' }));
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const chooseDate = (date: string) => {
    onChange(date);
    close();
  };
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  start.setDate(1 - start.getDay());
  const days = Array.from(
    { length: 42 },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
  const Icon = type === 'date' ? CalendarDays : Clock;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        className={`${className || 'gt-field'} gt-picker-trigger`}
        onClick={() => {
          if (open) {
            close();
            return;
          }
          setMonth(
            type === 'date' && selected && !isNaN(selected.getTime()) ? selected : new Date(),
          );
          panel.current?.showPopover();
        }}
      >
        <span className={!value ? 'gt-picker-placeholder' : ''}>
          {value
            ? type === 'date'
              ? value.replaceAll('-', '/')
              : value
            : type === 'date'
              ? words.date
              : '--:--'}
        </span>
        <Icon size={16} />
      </button>
      <div
        ref={panel}
        id={id}
        tabIndex={-1}
        popover="auto"
        role="dialog"
        aria-label={label}
        className="gt-picker-panel"
        style={position}
        onToggle={(event) => setOpen(event.newState === 'open')}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        }}
      >
        <div className="gt-picker-caption">
          <Icon size={14} />
          <span>{label}</span>
        </div>
        {type === 'date' ? (
          <>
            <div className="gt-picker-month">
              <select
                aria-label={lang === 'zh' ? '月份' : lang === 'ja' ? '月' : 'Month'}
                value={month.getMonth()}
                onChange={(e) => setMonth(new Date(month.getFullYear(), Number(e.target.value), 1))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {new Intl.DateTimeFormat(localeFor(lang), { month: 'long' }).format(
                      new Date(2026, i, 1),
                    )}
                  </option>
                ))}
              </select>
              <input
                aria-label={lang === 'zh' ? '年份' : lang === 'ja' ? '年' : 'Year'}
                type="number"
                min="1"
                max="9999"
                value={month.getFullYear()}
                onChange={(e) => {
                  const year = Number(e.target.value);
                  if (year >= 100 && year <= 9999) setMonth(new Date(year, month.getMonth(), 1));
                }}
              />
              <button
                type="button"
                aria-label={words.previous}
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label={words.next}
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="gt-picker-grid">
              {Array.from({ length: 7 }, (_, i) => (
                <span className="gt-picker-weekday" key={i}>
                  {new Intl.DateTimeFormat(localeFor(lang), { weekday: 'narrow' }).format(
                    new Date(2026, 7, 2 + i),
                  )}
                </span>
              ))}
              {days.map((date) => (
                <button
                  type="button"
                  key={iso(date)}
                  aria-label={iso(date)}
                  aria-pressed={value === iso(date)}
                  aria-current={iso(date) === iso(now) ? 'date' : undefined}
                  className={date.getMonth() !== month.getMonth() ? 'gt-picker-muted' : ''}
                  onClick={() => chooseDate(iso(date))}
                >
                  {date.getDate()}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="gt-picker-time-display">
              {hour}
              <span>:</span>
              {minute}
            </div>
            <div className="gt-picker-time-columns">
              {[
                {
                  title: words.hour,
                  count: 24,
                  selected: hour,
                  change: (v: string) => onChange(`${v}:${minute}`),
                },
                {
                  title: words.minute,
                  count: 60,
                  selected: minute,
                  change: (v: string) => onChange(`${hour}:${v}`),
                },
              ].map((column) => (
                <div key={column.title}>
                  <div className="gt-picker-weekday">{column.title}</div>
                  <div className="gt-picker-scroll" role="group" aria-label={column.title}>
                    {Array.from({ length: column.count }, (_, i) => (
                      <button
                        type="button"
                        key={i}
                        aria-pressed={column.selected === pad(i)}
                        onClick={() => column.change(pad(i))}
                      >
                        {pad(i)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="gt-picker-footer">
          <button type="button" onClick={() => chooseDate('')}>
            {words.clear}
          </button>
          <button
            type="button"
            className="gt-picker-action"
            onClick={() => (type === 'date' ? chooseDate(iso(new Date())) : close())}
          >
            {type === 'date' ? words.today : words.done}
          </button>
        </div>
      </div>
    </>
  );
}
