import { create } from 'zustand';
import { db } from '../db/database';
import type { CalendarMarker, CountryCode } from '../lib/types';

function detectDefaultCountry(): CountryCode {
  if (typeof navigator === 'undefined') return 'CN';
  const lang = (navigator.language || 'en').toLowerCase();

  if (lang.startsWith('zh')) return 'CN';
  if (lang.startsWith('ja')) return 'JP';
  if (lang.startsWith('ko')) return 'KR';
  if (lang.startsWith('fr')) return 'FR';
  if (lang.startsWith('de')) return 'DE';
  if (lang.startsWith('hi')) return 'IN';
  if (lang.startsWith('it')) return 'IT';
  if (lang.startsWith('ru')) return 'RU';
  if (lang === 'pt-br') return 'BR';
  if (lang.startsWith('pt')) return 'BR';
  if (lang === 'es-mx') return 'MX';
  if (lang.startsWith('es')) return 'ES';
  if (lang === 'en-gb') return 'GB';
  if (lang === 'en-au') return 'AU';
  if (lang === 'en-in') return 'IN';
  if (lang.startsWith('en')) return 'US';

  return 'INTL';
}

interface CalendarStoreState {
  markers: CalendarMarker[];
  selectedCountry: CountryCode;
  isLoading: boolean;

  loadMarkers: () => Promise<void>;
  addMarker: (marker: Omit<CalendarMarker, 'id' | 'createdAt'>) => Promise<number>;
  updateMarker: (id: number, patch: Partial<CalendarMarker>) => Promise<void>;
  deleteMarker: (id: number) => Promise<void>;
  setSelectedCountry: (country: CountryCode) => void;
  getMarkersForDate: (date: string) => CalendarMarker[];
}

const calendarStore = create<CalendarStoreState>((set, get) => ({
  markers: [],
  selectedCountry: detectDefaultCountry(), // ✅ 根据浏览器语言自动检测
  isLoading: true,

  loadMarkers: async () => {
    set({ isLoading: true });
    const markers = await db.calendarMarkers.toArray();
    set({ markers, isLoading: false });
  },

  addMarker: async (markerInput) => {
    const now = new Date().toISOString();
    const marker = { ...markerInput, createdAt: now } as CalendarMarker;
    const id = await db.calendarMarkers.add(marker);
    set((s) => ({ markers: [...s.markers, { ...marker, id }] }));
    return id as number;
  },

  updateMarker: async (id, patch) => {
    await db.calendarMarkers.update(id, patch);
    set((s) => ({
      markers: s.markers.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  },

  deleteMarker: async (id) => {
    await db.calendarMarkers.delete(id);
    set((s) => ({ markers: s.markers.filter((m) => m.id !== id) }));
  },

  setSelectedCountry: (country) => set({ selectedCountry: country }),

  getMarkersForDate: (date: string) => {
    const { markers } = get();
    const [, m, d] = date.split('-').map(Number);
    return markers.filter((mk) => {
      if (mk.date === date) return true;
      if (mk.type === 'annual') {
        const [, mm, md] = mk.date.split('-').map(Number);
        return mm === m && md === d;
      }
      return false;
    });
  },
}));

export const useCalendarStore = calendarStore;

export function syncCalendarCountry(country: CountryCode) {
  calendarStore.setState({ selectedCountry: country });
}
