import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT, localeFor } from '../../lib/i18n';
import type { ResolvedLanguage } from '../../lib/i18n';
import { usePlanStore } from '../../stores/plan-store';
import { useTaskStore } from '../../stores/task-store';
import { useUIStore } from '../../stores/ui-store';
import { todayISO } from '../../lib/format-date';
import { DateTimePicker } from '../ui/DateTimePicker';
import {
  X,
  Plus,
  CalendarDays,
  FileText,
  ListTodo,
  Flag,
  Layout,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type {
  Planning,
  PlanningLane,
  PlanningMilestone,
  PlanningPeriodType,
} from '../../lib/types';

interface CreatePlanModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the modal edits this existing plan instead of creating one. */
  plan?: Planning | null;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseISODate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function computeRange(
  periodType: PlanningPeriodType,
  anchorDate: string,
  customStart: string,
  customEnd: string,
): { startDate: string; endDate: string } {
  if (periodType === 'custom') return { startDate: customStart, endDate: customEnd };
  if (!anchorDate) return { startDate: '', endDate: '' };
  const d = parseISODate(anchorDate);
  if (periodType === 'day') return { startDate: anchorDate, endDate: anchorDate };
  if (periodType === 'week') {
    const dow = d.getDay();
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (dow === 0 ? 6 : dow - 1));
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return { startDate: toISO(monday), endDate: toISO(sunday) };
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { startDate: toISO(start), endDate: toISO(end) };
}

function shortDate(s: string, lang: ResolvedLanguage): string {
  if (!s) return '';
  return new Intl.DateTimeFormat(localeFor(lang), { month: 'short', day: 'numeric' }).format(
    parseISODate(s),
  );
}

const PERIOD_LABEL_KEY = {
  day: 'dayView',
  week: 'weekView',
  month: 'monthView',
  custom: 'customView',
} as const;

export function CreatePlanModal({ open, onClose, plan }: CreatePlanModalProps) {
  const { t, lang } = useT();
  const addPlanning = usePlanStore((s) => s.addPlanning);
  const updatePlanning = usePlanStore((s) => s.updatePlanning);
  const addToast = useUIStore((s) => s.addToast);
  const tasks = useTaskStore((s) => s.tasks);
  const loadAllTasks = useTaskStore((s) => s.loadAllTasks);

  const isEditing = plan != null;

  const [title, setTitle] = useState(plan?.title ?? '');
  const [periodType, setPeriodType] = useState<PlanningPeriodType>(plan?.periodType ?? 'day');
  const [anchorDate, setAnchorDate] = useState(plan?.startDate || todayISO());
  const [customStart, setCustomStart] = useState(plan?.startDate || todayISO());
  const [customEnd, setCustomEnd] = useState(plan?.endDate || todayISO());
  const [goal, setGoal] = useState(plan?.goal ?? '');
  const [note, setNote] = useState(plan?.note ?? '');
  const [linkedTaskIds, setLinkedTaskIds] = useState<number[]>(plan?.taskIds ?? []);
  const [showTasks, setShowTasks] = useState(false);
  const [showMoreSettings, setShowMoreSettings] = useState(
    () => (plan?.milestones ?? []).length > 0 || (plan?.lanes ?? []).length > 0,
  );
  const [enableMilestones, setEnableMilestones] = useState((plan?.milestones ?? []).length > 0);
  const [milestones, setMilestones] = useState<PlanningMilestone[]>(plan?.milestones ?? []);
  const [enableLanes, setEnableLanes] = useState((plan?.lanes ?? []).length > 0);
  const [lanes, setLanes] = useState<PlanningLane[]>(plan?.lanes ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadAllTasks();
  }, [loadAllTasks]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const picker = document.querySelector<HTMLElement>('.gt-picker-panel:popover-open');
      if (picker) {
        event.preventDefault();
        picker.hidePopover();
        document.querySelector<HTMLElement>(`[aria-controls="${picker.id}"]`)?.focus();
        return;
      }
      onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'draft' && !task.completedAt),
    [tasks],
  );

  const weekPreview = useMemo(() => {
    const range = computeRange('week', anchorDate, '', '');
    if (!range.startDate) return '';
    return t('planWeekRange', {
      start: shortDate(range.startDate, lang),
      end: shortDate(range.endDate, lang),
    });
  }, [anchorDate, lang, t]);

  const monthPreview = useMemo(() => {
    const range = computeRange('month', anchorDate, '', '');
    if (!range.startDate) return '';
    return t('planMonthRange', {
      start: shortDate(range.startDate, lang),
      end: shortDate(range.endDate, lang),
    });
  }, [anchorDate, lang, t]);

  const toggleTask = (id: number) => {
    setLinkedTaskIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const addMilestone = () => {
    setMilestones((list) => [...list, { id: genId(), title: '', date: todayISO() }]);
  };
  const updateMilestone = (id: string, patch: Partial<PlanningMilestone>) => {
    setMilestones((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };
  const removeMilestone = (id: string) => {
    setMilestones((list) => list.filter((m) => m.id !== id));
  };

  const toggleLanes = (on: boolean) => {
    setEnableLanes(on);
    if (on && lanes.length === 0) {
      setLanes([
        { id: genId(), name: '', taskIds: [] },
        { id: genId(), name: '', taskIds: [] },
      ]);
    }
  };
  const updateLane = (id: string, name: string) => {
    setLanes((list) => list.map((l) => (l.id === id ? { ...l, name } : l)));
  };
  const removeLane = (id: string) => {
    setLanes((list) => list.filter((l) => l.id !== id));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!title.trim()) {
      addToast(t('planEnterTitle'), 'error');
      return;
    }
    const range = computeRange(periodType, anchorDate, customStart, customEnd);
    if (periodType === 'custom') {
      if (!range.startDate || !range.endDate || range.startDate > range.endDate) {
        addToast(t('invalidDateRange'), 'error');
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      if (isEditing && plan?.id != null) {
        await updatePlanning(plan.id, {
          title: title.trim(),
          goal: goal.trim(),
          note: note.trim(),
          periodType,
          startDate: range.startDate,
          endDate: range.endDate,
          taskIds: linkedTaskIds,
          milestones: enableMilestones ? milestones : [],
          lanes: enableLanes ? lanes : [],
          updatedAt: now,
        });
        addToast(t('saved'), 'success');
      } else {
        await addPlanning({
          title: title.trim(),
          goal: goal.trim(),
          note: note.trim(),
          periodType,
          startDate: range.startDate,
          endDate: range.endDate,
          taskIds: linkedTaskIds,
          milestones: enableMilestones ? milestones : [],
          lanes: enableLanes ? lanes : [],
          createdAt: now,
          updatedAt: now,
        });
        addToast(t('planCreated'), 'success');
      }
      onClose();
    } catch {
      addToast(t('operationFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop modal-backdrop-scroll animate-fade-in" onClick={onClose}>
      <div
        className="modal-panel create-task-modal gt-modal max-w-lg my-6 animate-modal-in"
        data-ui="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-plan-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header create-task-header">
          <h2 id="create-plan-title" className="create-task-header-title">
            {t(isEditing ? 'editPlan' : 'newPlan')}
          </h2>
          <div className="create-task-header-actions">
            <button
              type="button"
              onClick={onClose}
              className="create-task-close gt-button-icon"
              aria-label={t('closeDialog')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="create-task-body">
          <section className="create-task-title-zone">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('planName')}
              className="gt-field create-task-title-input"
              autoFocus
            />
          </section>

          {/* ── Period ── */}
          <section
            className="create-task-properties-island plan-period-island"
            aria-label={t('planPeriod')}
          >
            <div className="create-task-property-heading">
              <CalendarDays size={16} />
              <span>{t('planPeriod')}</span>
            </div>
            <div className="gt-segmented" role="group" aria-label={t('planPeriod')}>
              {(['day', 'week', 'month', 'custom'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={periodType === p ? 'is-active' : ''}
                  aria-pressed={periodType === p}
                  onClick={() => setPeriodType(p)}
                >
                  {t(PERIOD_LABEL_KEY[p])}
                </button>
              ))}
            </div>
            <div className={`plan-time-range plan-time-range--${periodType}`}>
              {periodType === 'day' && (
                <DateTimePicker
                  type="date"
                  value={anchorDate}
                  onChange={setAnchorDate}
                  aria-label={t('planTimeRange')}
                  className="gt-field"
                />
              )}
              {periodType === 'week' && (
                <>
                  <DateTimePicker
                    type="date"
                    value={anchorDate}
                    onChange={setAnchorDate}
                    aria-label={t('planSelectWeek')}
                    className="gt-field"
                  />
                  <span className="plan-range-hint">{weekPreview}</span>
                </>
              )}
              {periodType === 'month' && (
                <>
                  <DateTimePicker
                    type="date"
                    value={anchorDate}
                    onChange={setAnchorDate}
                    aria-label={t('planSelectMonth')}
                    className="gt-field"
                  />
                  <span className="plan-range-hint">{monthPreview}</span>
                </>
              )}
              {periodType === 'custom' && (
                <>
                  <DateTimePicker
                    type="date"
                    value={customStart}
                    onChange={setCustomStart}
                    aria-label={t('startDate')}
                    className="gt-field"
                  />
                  <DateTimePicker
                    type="date"
                    value={customEnd}
                    onChange={setCustomEnd}
                    aria-label={t('endDate')}
                    className="gt-field"
                  />
                </>
              )}
            </div>
          </section>

          {/* ── Goal ── */}
          <section className="create-task-notes-island">
            <div className="create-task-island-label">
              <label>
                <FileText size={15} /> {t('planGoal')}
              </label>
            </div>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={t('planGoal')}
              className="gt-field create-task-notes-input"
            />
          </section>

          {/* ── Linked tasks ── */}
          <section className="create-task-subtasks plan-linked-tasks">
            <button
              type="button"
              className="create-task-subtasks-toggle"
              onClick={() => setShowTasks((shown) => !shown)}
              aria-expanded={showTasks}
              aria-controls="plan-linked-task-picker"
            >
              <span className="create-task-subtasks-label">
                <ListTodo size={15} /> {t('planLinkTasks')}
              </span>
              {linkedTaskIds.length > 0 && (
                <span className="plan-count">{linkedTaskIds.length}</span>
              )}
              {showTasks ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <div
              id="plan-linked-task-picker"
              className="plan-linked-task-panel"
              hidden={!showTasks}
            >
              <div className="plan-task-picker">
                {activeTasks.length === 0 ? (
                  <p className="plan-picker-empty">{t('noTasks2')}</p>
                ) : (
                  activeTasks.map((task) => (
                    <label className="plan-task-row" key={task.id}>
                      <input
                        type="checkbox"
                        checked={linkedTaskIds.includes(task.id!)}
                        onChange={() => toggleTask(task.id!)}
                      />
                      <span>{task.title}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* ── Advanced planning settings ── */}
          <section className="create-task-subtasks plan-advanced-settings">
            <button
              type="button"
              className="create-task-subtasks-toggle"
              onClick={() => setShowMoreSettings((shown) => !shown)}
              aria-expanded={showMoreSettings}
              aria-controls="plan-advanced-settings-content"
            >
              <span className="create-task-subtasks-label">
                <Settings size={15} /> {t('planMoreSettings')}
              </span>
              {showMoreSettings ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <div
              id="plan-advanced-settings-content"
              className="plan-advanced-settings-content"
              hidden={!showMoreSettings}
            >
              <div className="plan-advanced-setting">
                <div className="plan-toggle-row plan-advanced-row">
                  <span className="create-task-island-label">
                    <Flag size={15} /> {t('planEnableMilestones')}
                  </span>
                  <button
                    type="button"
                    className="create-task-switch"
                    aria-pressed={enableMilestones}
                    aria-label={t('planEnableMilestones')}
                    onClick={() => setEnableMilestones((v) => !v)}
                  >
                    <span />
                  </button>
                </div>
                {enableMilestones && (
                  <div className="plan-items plan-advanced-details">
                    {milestones.map((m) => (
                      <div className="plan-item-row" key={m.id}>
                        <input
                          type="text"
                          value={m.title}
                          onChange={(e) => updateMilestone(m.id, { title: e.target.value })}
                          placeholder={t('planMilestoneName')}
                          className="gt-field plan-item-input"
                        />
                        <DateTimePicker
                          type="date"
                          value={m.date}
                          onChange={(date) => updateMilestone(m.id, { date })}
                          aria-label={t('planMilestoneDate')}
                          className="gt-field plan-item-date"
                        />
                        <button
                          type="button"
                          className="plan-item-remove"
                          onClick={() => removeMilestone(m.id)}
                          aria-label={t('delete')}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="plan-add-btn" onClick={addMilestone}>
                      <Plus size={14} /> {t('planAddMilestone')}
                    </button>
                  </div>
                )}
              </div>

              <div className="plan-advanced-setting">
                <div className="plan-toggle-row plan-advanced-row">
                  <span className="create-task-island-label">
                    <Layout size={15} /> {t('planEnableLanes')}
                  </span>
                  <button
                    type="button"
                    className="create-task-switch"
                    aria-pressed={enableLanes}
                    aria-label={t('planEnableLanes')}
                    onClick={() => toggleLanes(!enableLanes)}
                  >
                    <span />
                  </button>
                </div>
                {enableLanes && (
                  <div className="plan-items plan-advanced-details">
                    {lanes.map((l) => (
                      <div className="plan-item-row" key={l.id}>
                        <input
                          type="text"
                          value={l.name}
                          onChange={(e) => updateLane(l.id, e.target.value)}
                          placeholder={t('planLaneName')}
                          className="gt-field plan-item-input"
                        />
                        <button
                          type="button"
                          className="plan-item-remove"
                          onClick={() => removeLane(l.id)}
                          aria-label={t('delete')}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="plan-add-btn"
                      onClick={() =>
                        setLanes((list) => [...list, { id: genId(), name: '', taskIds: [] }])
                      }
                    >
                      <Plus size={14} /> {t('planAddLane')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Planning note ── */}
          <section className="create-task-notes-island">
            <div className="create-task-island-label">
              <label>
                <FileText size={15} /> {t('planNote')}
              </label>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('planNote')}
              rows={2}
              className="gt-field plan-note"
            />
          </section>
        </div>

        <div className="modal-actions create-task-footer plan-modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="create-task-cancel gt-button-ghost px-3 py-2.5 text-sm"
          >
            {t('cancelBtn')}
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={!title.trim() || isSubmitting}
            className="gt-button-primary create-task-submit py-2.5 text-sm"
          >
            {t(isEditing ? 'save' : 'planCreate')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
