import { useState, useRef, useCallback } from 'react';
import { useTaskStore } from '../../stores/task-store';
import { useUIStore } from '../../stores/ui-store';
import { useT } from '../../lib/i18n';
import { Plus } from 'lucide-react';

interface AddTaskInlineProps {
  listId: number;
}

export function AddTaskInline({ listId }: AddTaskInlineProps) {
  const [title, setTitle] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const isComposingRef = useRef(false);
  const addTask = useTaskStore((s) => s.addTask);
  const addToast = useUIStore((s) => s.addToast);
  const { t } = useT();

  const handleSubmit = useCallback(async () => {
    if (title.trim()) {
      await addTask({
        listId,
        title: title.trim(),
        notes: '',
        priority: 'low',
        isFlagged: false,
        dueDate: null,
        dueTime: null,
        completedAt: null,
        recurrenceRuleId: null,
        parentTaskId: null,
        locationTriggerId: null,
        templateId: null,
        sortOrder: 0,
        dateMode: 'simple',
        dateStart: null,
        dateEnd: null,
        dateTarget: null,
        status: 'active',
        milestones: '[]',
      });
      addToast(t('taskCreated', { title: title.trim() }), 'success');
      setTitle('');
      setIsOpen(false);
    }
  }, [addTask, addToast, listId, t, title]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Check IME composition state before acting on Enter
      const nativeComposing = (e.nativeEvent as { isComposing?: boolean }).isComposing;
      if (e.key === 'Enter') {
        if (nativeComposing === true || isComposingRef.current) {
          // User is selecting a CJK IME candidate — do NOT submit
          e.preventDefault();
          return;
        }
        handleSubmit();
      }
      if (e.key === 'Escape') {
        setTitle('');
        setIsOpen(false);
      }
    },
    [handleSubmit],
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-3 text-sm text-gray-400 hover:text-blue-500 transition-colors"
      >
        <Plus size={16} />
        {t('addTask')}
      </button>
    );
  }

  return (
    <div className="px-3 py-2 border-b border-gray-100">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onCompositionEnd={() => {
          isComposingRef.current = false;
        }}
        onKeyDown={handleKeyDown}
        placeholder={t('taskTitlePlaceholder')}
        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        autoFocus
      />
      <p className="text-xs text-gray-400 mt-1 px-1">{t('addTaskHint')}</p>
    </div>
  );
}
