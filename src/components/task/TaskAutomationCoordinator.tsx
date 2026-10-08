import { useCallback, useEffect, useRef } from 'react';
import { automaticReschedulePatch } from '../../lib/daily-reminders';
import { useTaskStore } from '../../stores/task-store';

const CHECK_INTERVAL_MS = 60_000;

/** Applies saved unfinished-task policies without adding another visible UI. */
export function TaskAutomationCoordinator() {
  const tasks = useTaskStore((state) => state.tasks);
  const isLoading = useTaskStore((state) => state.isLoading);
  const updateTask = useTaskStore((state) => state.updateTask);
  const saveDirtyTasks = useTaskStore((state) => state.saveDirtyTasks);
  const runningRef = useRef(false);

  const applyPolicies = useCallback(async () => {
    if (isLoading || runningRef.current) return;
    const patches = tasks
      .filter((task) => task.id !== undefined)
      .map((task) => ({ task, patch: automaticReschedulePatch(task) }))
      .filter((entry): entry is typeof entry & { patch: NonNullable<typeof entry.patch> } =>
        entry.patch !== null,
      );
    if (patches.length === 0) return;

    runningRef.current = true;
    try {
      for (const { task, patch } of patches) updateTask(task.id!, patch);
      await saveDirtyTasks();
    } finally {
      runningRef.current = false;
    }
  }, [isLoading, saveDirtyTasks, tasks, updateTask]);

  useEffect(() => {
    void applyPolicies();
    const timer = window.setInterval(() => void applyPolicies(), CHECK_INTERVAL_MS);
    const handleFocus = () => void applyPolicies();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [applyPolicies]);

  return null;
}
