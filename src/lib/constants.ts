import type { Priority } from './types';

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#ef4444',
};

export const TAG_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

export const AUTOSAVE_INTERVAL_MS = 3000;
export const DEBOUNCE_MS = 500;
