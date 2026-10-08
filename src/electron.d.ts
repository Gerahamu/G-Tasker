interface QuickMemoSaveRequest {
  requestId: string;
  content: string;
}

interface QuickMemoSaveResult {
  ok: boolean;
  id?: number;
  error?: string;
}

interface Window {
  gtaskerQuickMemo?: {
    save: (content: string) => Promise<{ ok: true; id: number }>;
    hide: () => Promise<void>;
    onActivate: (listener: () => void) => () => void;
    onReset: (listener: () => void) => () => void;
  };
  gtaskerMemoBridge?: {
    onSaveRequest: (listener: (request: QuickMemoSaveRequest) => void) => () => void;
    respondSaveRequest: (requestId: string, result: QuickMemoSaveResult) => void;
  };
  gtaskerReminders?: {
    nativeNotifications: boolean;
    syncSchedule: (schedule: unknown) => Promise<{ loaded: number; failed: number }>;
    snooze: (event: unknown, minutes: number) => Promise<void>;
  };
}
