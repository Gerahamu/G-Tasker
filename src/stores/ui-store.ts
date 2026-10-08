import { create } from 'zustand';
import type { Toast, CountryCode } from '../lib/types';

export type AppLanguage = 'auto' | 'zh' | 'en' | 'ja';

const isMobileViewport =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(max-width: 767px)').matches;

export interface CreateTaskRequest {
  initialTitle?: string;
  initialDate?: string;
  onCreated?: () => void | Promise<void>;
}

interface UIStoreState {
  sidebarOpen: boolean;
  activeListId: number | null;
  theme: 'light' | 'dark';
  language: AppLanguage;
  calendarCountry: CountryCode | 'auto';
  toasts: Toast[];

  showCreateModal: boolean;
  showCreateList: boolean;
  showCreateTag: boolean;
  showCreatePlan: boolean;
  presetListId: number | null;
  createTaskRequest: CreateTaskRequest | null;
  setShowCreateModal: (show: boolean) => void;
  setShowCreateList: (show: boolean) => void;
  setShowCreateTag: (show: boolean) => void;
  setShowCreatePlan: (show: boolean) => void;
  setPresetListId: (id: number | null) => void;
  setCreateTaskRequest: (request: CreateTaskRequest | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveListId: (id: number | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: AppLanguage) => void;
  setCalendarCountry: (country: CountryCode | 'auto') => void;
  addToast: (
    message: string,
    type: Toast['type'],
    options?: Pick<Toast, 'actionLabel' | 'onAction'> & { durationMs?: number },
  ) => void;
  removeToast: (id: string) => void;
}

// ✅ 默认始终为 'auto'，由 resolveLang 在运行时解析实际语言
// 这样用户才能选择具体语言来触发"确认修改"按钮

export const useUIStore = create<UIStoreState>((set, get) => ({
  sidebarOpen: !isMobileViewport,
  showCreateModal: false,
  showCreateList: false,
  showCreateTag: false,
  showCreatePlan: false,
  presetListId: null,
  createTaskRequest: null,
  activeListId: null,
  theme: 'light',
  language: 'auto', // ✅ 默认跟随设备，运行时解析
  calendarCountry: 'auto',
  toasts: [],

  setShowCreateModal: (show) =>
    set(
      show
        ? { showCreateModal: true }
        : { showCreateModal: false, presetListId: null, createTaskRequest: null },
    ),
  setShowCreateList: (show) => set({ showCreateList: show }),
  setShowCreateTag: (show) => set({ showCreateTag: show }),
  setShowCreatePlan: (show) => set({ showCreatePlan: show }),
  setPresetListId: (id) => set({ presetListId: id }),
  setCreateTaskRequest: (request) => set({ createTaskRequest: request }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveListId: (id) => set({ activeListId: id }),
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },
  setLanguage: (language) => set({ language }),
  setCalendarCountry: (calendarCountry) => set({ calendarCountry }),
  addToast: (message, type, options) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    set((s) => ({
      toasts: [
        ...s.toasts,
        {
          id,
          message,
          type,
          actionLabel: options?.actionLabel,
          onAction: options?.onAction,
        },
      ],
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, options?.durationMs ?? 3000);
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
