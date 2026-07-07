import { create } from 'zustand';
import type { Toast, CountryCode } from '../lib/types';

export type AppLanguage = 'auto' | 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'pt' | 'ru' | 'hi' | 'it';

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  auto: '跟随设备',
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  ru: 'Русский',
  hi: 'हिन्दी',
  it: 'Italiano',
};

export { LANGUAGE_LABELS };

interface UIStoreState {
  sidebarOpen: boolean;
  activeListId: number | null;
  theme: 'light' | 'dark';
  language: AppLanguage;
  calendarCountry: CountryCode | 'auto';
  toasts: Toast[];

  showCreateModal: boolean;
  presetListId: number | null;
  setShowCreateModal: (show: boolean) => void;
  setPresetListId: (id: number | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveListId: (id: number | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: AppLanguage) => void;
  setCalendarCountry: (country: CountryCode | 'auto') => void;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
}

// ✅ 默认始终为 'auto'，由 resolveLang 在运行时解析实际语言
// 这样用户才能选择具体语言来触发"确认修改"按钮

export const useUIStore = create<UIStoreState>((set, get) => ({
  sidebarOpen: true,
  showCreateModal: false,
  presetListId: null,
  activeListId: null,
  theme: 'light',
  language: 'auto', // ✅ 默认跟随设备，运行时解析
  calendarCountry: 'auto',
  toasts: [],

  setShowCreateModal: (show) => set({ showCreateModal: show }),
  setPresetListId: (id) => set({ presetListId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveListId: (id) => set({ activeListId: id }),
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },
  setLanguage: (language) => set({ language }),
  setCalendarCountry: (calendarCountry) => set({ calendarCountry }),
  addToast: (message, type) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
