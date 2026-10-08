import type { Task } from '../../lib/types';
import { useT } from '../../lib/i18n';
import { useTaskStore } from '../../stores/task-store';
import { useUIStore } from '../../stores/ui-store';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface TaskDeleteDialogProps {
  task: Task;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function TaskDeleteDialog({ task, open, onClose, onDeleted }: TaskDeleteDialogProps) {
  const { t } = useT();
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const addToast = useUIStore((state) => state.addToast);
  if (!open) return null;

  return (
    <ConfirmDialog
      title={t('deleteTask')}
      message={`${t('deleteTaskConfirm')}「${task.title}」？${t('irreversable')}`}
      confirmLabel={t('deleteBtn')}
      onCancel={onClose}
      onConfirm={async () => {
        try {
          await deleteTask(task.id!);
          addToast(t('deletedToast'), 'success');
          onDeleted();
        } catch {
          addToast(t('operationFailed'), 'error');
        }
      }}
    />
  );
}
