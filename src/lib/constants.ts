import type { Priority, SmartListType } from './types';

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#ef4444',
};

export const SMART_LIST_NAMES: Record<SmartListType, string> = {
  today: '今天',
  scheduled: '已计划',
  all: '全部任务',
  flagged: '已标记',
  overdue: '逾期',
};

export const SMART_LIST_ICONS: Record<SmartListType, string> = {
  today: 'Calendar',
  scheduled: 'Clock',
  all: 'List',
  flagged: 'Flag',
  overdue: 'AlertCircle',
};

export const DEFAULT_LISTS = [
  { name: '工作', color: '#3b82f6', icon: 'Briefcase' },
  { name: '学习', color: '#8b5cf6', icon: 'BookOpen' },
  { name: '个人', color: '#10b981', icon: 'User' },
];

export const TAG_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

export const AUTOSAVE_INTERVAL_MS = 3000;
export const DEBOUNCE_MS = 500;
