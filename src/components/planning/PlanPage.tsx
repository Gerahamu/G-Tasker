import { useEffect, useMemo, useState } from 'react';
import { usePlanStore } from '../../stores/plan-store';
import { useTaskStore } from '../../stores/task-store';
import { useUIStore } from '../../stores/ui-store';
import { useT, localeFor } from '../../lib/i18n';
import type { ResolvedLanguage } from '../../lib/i18n';
import type { Planning } from '../../lib/types';
import { Trash2, CalendarDays, ListTodo, Flag, Layout } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { CreatePlanModal } from './CreatePlanModal';

function parseISODate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatRangeLabel(start: string, end: string, lang: ResolvedLanguage): string {
  if (!start && !end) return '';
  const fmt = new Intl.DateTimeFormat(localeFor(lang), { month: 'short', day: 'numeric' });
  const s = start ? fmt.format(parseISODate(start)) : '';
  const e = end ? fmt.format(parseISODate(end)) : '';
  if (start && start === end) return s;
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

export function PlanPage() {
  const { t, lang } = useT();
  const plannings = usePlanStore((s) => s.plannings);
  const load = usePlanStore((s) => s.load);
  const deletePlanning = usePlanStore((s) => s.deletePlanning);
  const tasks = useTaskStore((s) => s.tasks);
  const loadAllTasks = useTaskStore((s) => s.loadAllTasks);
  const addToast = useUIStore((s) => s.addToast);
  const showCreatePlan = useUIStore((s) => s.showCreatePlan);
  const setShowCreatePlan = useUIStore((s) => s.setShowCreatePlan);

  const [editingPlan, setEditingPlan] = useState<Planning | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Planning | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([load(), loadAllTasks()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load, loadAllTasks]);

  const taskById = useMemo(() => {
    const map = new Map<number, { completedAt: string | null }>();
    for (const task of tasks) if (task.id != null) map.set(task.id, task);
    return map;
  }, [tasks]);

  const confirmDeletePlan = async () => {
    if (isMutating) return;
    const targetId = deleteTarget?.id;
    if (targetId == null) return;
    setIsMutating(true);
    try {
      await deletePlanning(targetId);
      setDeleteTarget(null);
      addToast(t('deleted3'), 'success');
    } catch {
      addToast(t('operationFailed'), 'error');
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="planning-page">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : plannings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-mark" aria-hidden="true" />
          <p>{t('noPlans')}</p>
        </div>
      ) : (
        <div className="plan-list space-y-3">
          {plannings.map((plan) => {
            const completedCount = plan.taskIds.filter(
              (id) => taskById.get(id)?.completedAt,
            ).length;
            const progress = plan.taskIds.length
              ? Math.round((completedCount / plan.taskIds.length) * 100)
              : 0;
            const milestoneCount = plan.milestones.filter((m) => m.title.trim()).length;
            const laneCount = plan.lanes.filter((l) => l.name.trim()).length;
            return (
              <div
                key={plan.id}
                className="card plan-card"
                role="button"
                tabIndex={0}
                onClick={() => setEditingPlan(plan)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setEditingPlan(plan);
                  }
                }}
              >
                <div className="plan-card-main">
                  <h3 className="plan-card-title">{plan.title || t('untitled')}</h3>
                  {plan.goal && <p className="plan-card-goal">{plan.goal}</p>}
                  <p className="plan-card-range">
                    <CalendarDays size={13} aria-hidden="true" />
                    <span>{formatRangeLabel(plan.startDate, plan.endDate, lang)}</span>
                  </p>
                  <div className="plan-card-meta">
                    <span>
                      <ListTodo size={13} aria-hidden="true" />
                      {plan.taskIds.length} {t('planTasksUnit')}
                    </span>
                    {milestoneCount > 0 && (
                      <span>
                        <Flag size={13} aria-hidden="true" />
                        {milestoneCount} {t('planMilestonesUnit')}
                      </span>
                    )}
                    {laneCount > 0 && (
                      <span>
                        <Layout size={13} aria-hidden="true" />
                        {laneCount} {t('planLanesUnit')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="plan-card-progress">
                  <div className="plan-card-progress-row">
                    <span>{t('planProgress')}</span>
                    <span>{progress}%</span>
                  </div>
                  <div
                    className="plan-progress-track"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="plan-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <button
                  type="button"
                  className="plan-card-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(plan);
                  }}
                  aria-label={t('delPlan')}
                  title={t('delPlan')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showCreatePlan && (
        <CreatePlanModal key="create-plan" open onClose={() => setShowCreatePlan(false)} />
      )}
      {editingPlan && (
        <CreatePlanModal
          key={`edit-plan-${editingPlan.id ?? 'new'}`}
          open
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t('delPlan')}
          message={t('delPlanConfirm')}
          confirmLabel={t('delete3')}
          cancelLabel={t('cancel3')}
          onConfirm={() => void confirmDeletePlan()}
          onCancel={() => !isMutating && setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
