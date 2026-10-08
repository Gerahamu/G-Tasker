import { useCallback } from 'react';
import { db } from '../db/database';
import type { Subtask } from './types';
import { beginCompletionOperation, isCurrentCompletionOperation } from './completion-operation';
import { useT } from './i18n';
import { useTaskStore } from '../stores/task-store';
import { useUIStore } from '../stores/ui-store';

export function useCompletionActions() {
  const { t } = useT();
  const addToast = useUIStore((state) => state.addToast);
  const persistTaskCompletion = useTaskStore((state) => state.persistTaskCompletion);

  const setTaskCompletion = useCallback(
    async (taskId: number, completed: boolean) => {
      const key = `task:${taskId}`;
      const revision = beginCompletionOperation(key);
      let nextOccurrenceId: number | null = null;
      try {
        await persistTaskCompletion(taskId, completed);
        if (completed) {
          nextOccurrenceId = await useTaskStore
            .getState()
            .createNextRecurringOccurrence(taskId);
        }
      } catch {
        addToast(t('operationFailed'), 'error');
        return;
      }
      if (!completed) return;
      const title = useTaskStore.getState().getTask(taskId)?.title ?? '';
      addToast(t('taskCompletedToast', { title }), 'success', {
        actionLabel: t('undo'),
        durationMs: 4500,
        onAction: async () => {
          if (!isCurrentCompletionOperation(key, revision)) return;
          beginCompletionOperation(key);
          try {
            await useTaskStore.getState().revertTaskCompletion(taskId, nextOccurrenceId);
          } catch {
            addToast(t('operationFailed'), 'error');
          }
        },
      });
    },
    [addToast, persistTaskCompletion, t],
  );

  const setSubtaskCompletion = useCallback(
    async (subtask: Subtask, completed: boolean, refresh: () => void | Promise<void>) => {
      const key = `subtask:${subtask.id}`;
      const revision = beginCompletionOperation(key);
      try {
        await db.subtasks.update(subtask.id!, {
          completed,
          completedAt: completed ? new Date().toISOString() : null,
        });
        await refresh();
      } catch {
        addToast(t('operationFailed'), 'error');
        return;
      }
      if (!completed) return;
      addToast(t('subtaskCompletedToast', { title: subtask.title }), 'success', {
        actionLabel: t('undo'),
        durationMs: 4500,
        onAction: async () => {
          if (!isCurrentCompletionOperation(key, revision)) return;
          beginCompletionOperation(key);
          try {
            await db.subtasks.update(subtask.id!, { completed: false, completedAt: null });
            await refresh();
          } catch {
            addToast(t('operationFailed'), 'error');
          }
        },
      });
    },
    [addToast, t],
  );

  return { setTaskCompletion, setSubtaskCompletion };
}
