import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router/routes';
import { initAutoSave } from './autosave/autosave-engine';
import { I18nProvider, CalendarCountryProvider } from './lib/i18n';
import { useTagStore } from './stores/tag-store';
import { useListStore } from './stores/list-store';
import { useTaskStore } from './stores/task-store';
import { OnboardingGuide, isOnboardingDone } from './components/onboarding/OnboardingGuide';
import { db } from './db/database';

async function ensureDefaultList() {
  try {
    const all = await db.taskLists.toArray();
    const has = all.some(l => l.name === '默认列表');
    if (!has) {
      await db.taskLists.add({
        name: '默认列表', color: '#3b82f6', icon: 'Inbox',
        sortOrder: 1, isSmartList: false, filterConfig: null,
        createdAt: new Date().toISOString(),
      });
      // StrictMode 可能并发创建两份，等加载后去重
      const reloaded = await db.taskLists.toArray();
      const defaults = reloaded.filter(l => l.name === '默认列表');
      if (defaults.length > 1) {
        defaults.sort((a, b) => (a.id || 0) - (b.id || 0));
        for (let i = 1; i < defaults.length; i++) {
          await db.taskLists.delete(defaults[i].id!);
        }
      }
    }
  } catch { /* silent */ }
}

function initTheme() {
  const mode = localStorage.getItem('theme-mode') || 'system';
  if (mode === 'dark') document.documentElement.classList.add('dark');
  else if (mode === 'light') document.documentElement.classList.remove('dark');
  else {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }
}

function initFontSize() {
  const size = localStorage.getItem('font-size') || 'normal';
  document.documentElement.classList.remove('font-scale-small', 'font-scale-normal', 'font-scale-large');
  document.documentElement.classList.add(`font-scale-${size}`);
}

export default function App() {
  const loadTags = useTagStore((s) => s.loadTags);
  const loadLists = useListStore((s) => s.loadLists);
  const loadAllTasks = useTaskStore((s) => s.loadAllTasks);
  const [showOnboarding, setShowOnboarding] = useState(!isOnboardingDone());

  useEffect(() => {
    initTheme();
    initFontSize();
    initAutoSave();
    loadTags();
    loadAllTasks();
    ensureDefaultList().then(() => loadLists());
  }, []);

  return (
    <I18nProvider>
      <CalendarCountryProvider>
        <RouterProvider router={router} />
        <OnboardingGuide open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      </CalendarCountryProvider>
    </I18nProvider>
  );
}
