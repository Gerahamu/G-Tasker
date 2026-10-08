export interface Task {
  id?: number;
  listId: number;
  title: string;
  notes: string;
  priority: 'low' | 'medium' | 'high';
  isFlagged: boolean;
  dueDate: string | null;
  dueTime: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
  recurrenceRuleId: number | null;
  parentTaskId: number | null;
  locationTriggerId: number | null;
  templateId: number | null;
  // Advanced date mode
  dateMode: 'simple' | 'advanced';
  dateStart: string | null;
  dateEnd: string | null;
  dateTarget: string | null;
  status: 'active' | 'draft';
  milestones: string; // JSON array of {name, date, description}
  /** Optional scheduling intent. Undefined values are the safe defaults for legacy tasks. */
  durationMinutes?: number | null;
  repeatRule?: TaskRepeatRule | null;
  reminder?: TaskReminder | null;
  timeFlexibility?: TimeFlexibility;
  timeWindowStart?: string | null;
  timeWindowEnd?: string | null;
  reschedulePolicy?: ReschedulePolicy;
  timeBlockLocked?: boolean;
}

/**
 * The task-owned portion of a create form. Lifecycle and identity fields are
 * deliberately excluded so a draft can never become a task by reusing its ID.
 */
export type TaskCreationData = Omit<
  Task,
  'id' | 'completedAt' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'status'
>;

/** A complete, serializable snapshot of every value that affects task creation. */
export interface TaskFormSnapshot {
  task: TaskCreationData;
  subtaskTitles: string[];
  tagIds: number[];
}

export interface TaskDraft {
  id?: number;
  title: string;
  snapshot: TaskFormSnapshot;
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  /** Present only when an old hidden Task record was migrated. */
  legacyTaskId?: number;
}

export type RepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type RepeatUnit = 'day' | 'week' | 'month';
export interface TaskRepeatRule {
  frequency: RepeatFrequency;
  interval?: number;
  unit?: RepeatUnit;
  weekdays?: number[];
  endDate?: string | null;
}

export interface TaskReminder {
  anchor: 'start' | 'due';
  minutesBefore: number;
}

export type TimeFlexibility = 'fixed' | 'suggested' | 'anytime' | 'window';
export type ReschedulePolicy = 'overdue' | 'tomorrow' | 'next_available';

export interface Subtask {
  id?: number;
  taskId: number;
  title: string;
  completed: boolean;
  /** Optional so pre-existing IndexedDB records remain readable. */
  completedAt?: string | null;
  sortOrder: number;
  dueDate: string | null;
  dueTime: string | null;
  notes: string;
  createdAt: string;
}

export interface Attachment {
  id?: number;
  taskId: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  createdAt: string;
}

export interface Tag {
  id?: number;
  name: string;
  color: string;
}

export interface TaskTag {
  id?: number;
  taskId: number;
  tagId: number;
}

export interface TaskDependency {
  id?: number;
  taskId: number;
  dependsOnTaskId: number;
}

export interface TaskList {
  id?: number;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  isSmartList: boolean;
  filterConfig: string | null;
  createdAt: string;
}

export interface RecurrenceRule {
  id?: number;
  rruleString: string;
  workdayMode: boolean;
  exclusionDates: string;
  modifiedInstances: string;
  createdAt: string;
}

export interface TaskTemplate {
  id?: number;
  name: string;
  taskDefaults: string;
  subtaskTemplates: string;
  createdAt: string;
}

export interface LocationTrigger {
  id?: number;
  name: string;
  type: 'gps' | 'wifi';
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  wifiSSID: string | null;
  triggerOn: 'arrive' | 'leave';
  createdAt: string;
}

export interface Reminder {
  id?: number;
  taskId: number;
  reminderAt: string;
  type: 'desktop' | 'urgent' | 'overdue';
  isFired: boolean;
  createdAt: string;
}

export interface NotificationLog {
  id?: number;
  taskId: number | null;
  title: string;
  body: string;
  type: 'reminder' | 'urgent' | 'overdue' | 'location' | 'dependency';
  deliveredAt: string;
  wasClicked: boolean;
}

export type Priority = 'low' | 'medium' | 'high';

export type SmartListType = 'today' | 'scheduled' | 'all' | 'flagged' | 'overdue';

export interface SmartListFilter {
  type: SmartListType;
  customRules?: {
    priorities?: Priority[];
    tags?: number[];
    dateRange?: { start: string; end: string };
  };
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

// Planning module — template-based, no date binding
export interface Plan {
  id?: number;
  name: string;
  type: 'day' | 'week' | 'month' | 'custom';
  goal: string;
  note: string;
  daysCount: number; // 1 for day, 7 for week, 28-31 for month, N for custom
  createdAt: string;
}
export interface PlanBlock {
  id?: number;
  planId: number;
  dayIndex: number; // 0-based day index within the plan
  startTime: string; // "HH:mm"
  endTime: string;
  title: string;
  description: string;
  sortOrder: number;
  createdAt: string;
}
// ──── Planning module ─────────────────────────────────────────────
// A "plan" is an organizational layer over existing tasks — NOT a task tree.
// It references existing task IDs (taskIds, and per-lane taskIds) rather than
// duplicating Task objects.
export type PlanningPeriodType = 'day' | 'week' | 'month' | 'custom';

export interface PlanningMilestone {
  id: string;
  title: string;
  date: string; // ISO "YYYY-MM-DD"
}

export interface PlanningLane {
  id: string;
  name: string;
  taskIds: number[];
}

export interface Planning {
  id?: number;
  title: string;
  goal: string;
  note: string;
  periodType: PlanningPeriodType;
  startDate: string; // ISO "YYYY-MM-DD"
  endDate: string; // ISO "YYYY-MM-DD"
  taskIds: number[];
  milestones: PlanningMilestone[];
  lanes: PlanningLane[];
  createdAt: string;
  updatedAt: string;
}

// Legacy types
export interface MonthlyPlan {
  id?: number;
  month: string;
  goal: string;
  highlights: string;
  createdAt: string;
}
export interface WeeklyPlan {
  id?: number;
  monthlyPlanId: number;
  weekIndex: number;
  theme: string;
  createdAt: string;
}
export interface DayPlan {
  id?: number;
  weeklyPlanId: number;
  dayOfWeek: number;
  date: string | null;
  note: string;
  createdAt: string;
}
export interface TimeBlock {
  id?: number;
  dayPlanId: number;
  startTime: string;
  endTime: string;
  content: string;
  sortOrder: number;
  createdAt: string;
}

// Inbox module
export interface InboxItem {
  id?: number;
  title: string;
  content: string;
  status: 'unprocessed' | 'converted';
  createdAt: string;
}

// Memo module
export interface Memo {
  id?: number;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string;
}

// Calendar feature types
export interface CalendarMarker {
  id?: number;
  date: string; // ISO date "YYYY-MM-DD"
  title: string; // marker description
  type: 'annual' | 'once'; // 每年循环 or 仅此一年
  color: string; // hex color
  createdAt: string;
}

export interface TimeMark {
  id?: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  color: string;
  displayMode: 'bar';
  priority: number;
  showInMonth: boolean;
  showOnHome: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CalendarMode = 'solar' | 'lunar';

export type CountryCode =
  | 'CN'
  | 'US'
  | 'JP'
  | 'KR'
  | 'GB'
  | 'FR'
  | 'DE'
  | 'IN'
  | 'BR'
  | 'AU'
  | 'IT'
  | 'ES'
  | 'RU'
  | 'MX'
  | 'INTL';

export interface HolidayDef {
  name: string; // holiday name (localized)
  month: number; // 1-12 (solar) or 1-12 (lunar)
  day: number; // 1-31
  isLunar: boolean; // whether it follows lunar calendar
  color: string; // display color
}
