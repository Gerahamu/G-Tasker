export type TaskExpandTrigger = 'click' | 'hover';

export const TASK_EXPAND_TRIGGER_KEY = 'task-expand-trigger';

export function readTaskExpandTrigger(): TaskExpandTrigger {
  try {
    const value = JSON.parse(localStorage.getItem(TASK_EXPAND_TRIGGER_KEY) ?? '"click"');
    return value === 'hover' ? 'hover' : 'click';
  } catch {
    return 'click';
  }
}

export function saveTaskExpandTrigger(trigger: TaskExpandTrigger) {
  localStorage.setItem(TASK_EXPAND_TRIGGER_KEY, JSON.stringify(trigger));
}
