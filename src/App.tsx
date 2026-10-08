import { useCallback, useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router/routes';
import { initAutoSave, reportSaveFailure, stopAutoSave } from './autosave/autosave-engine';
import { I18nProvider, CalendarCountryProvider } from './lib/i18n';
import { useListStore } from './stores/list-store';
import { useTaskStore } from './stores/task-store';
import { useMemoStore } from './stores/memo-store';
import { OnboardingGuide, isOnboardingDone } from './components/onboarding/OnboardingGuide';
import { ensureDefaultList } from './db/task-operations';
import { StartupAnimation } from './components/startup/StartupAnimation';

export default function App() {
  const skipStartupAnimation = new URLSearchParams(window.location.search).has('skipStartup');
  const loadLists = useListStore((s) => s.loadLists);
  const loadAllTasks = useTaskStore((s) => s.loadAllTasks);
  const [showOnboarding, setShowOnboarding] = useState(!isOnboardingDone());
  const [appReady, setAppReady] = useState(false);
  const [startupActive, setStartupActive] = useState(!skipStartupAnimation);
  const [startupVisible, setStartupVisible] = useState(!skipStartupAnimation);

  const revealStartup = useCallback(() => setStartupActive(false), []);
  const completeStartup = useCallback(() => setStartupVisible(false), []);

  useEffect(() => {
    initAutoSave();
    let active = true;

    void ensureDefaultList()
      .then(() => Promise.all([loadAllTasks(), loadLists()]))
      .catch(reportSaveFailure)
      .finally(() => {
        if (active) setAppReady(true);
      });

    return () => {
      active = false;
      stopAutoSave();
    };
  }, [loadAllTasks, loadLists]);

  useEffect(() => {
    const unsubscribe = window.gtaskerMemoBridge?.onSaveRequest(({ requestId, content }) => {
      void (async () => {
        const normalized = content.trim();
        if (!normalized) {
          window.gtaskerMemoBridge?.respondSaveRequest(requestId, {
            ok: false,
            error: 'empty',
          });
          return;
        }

        try {
          const now = new Date().toISOString();
          const id = await useMemoStore.getState().addMemo({
            title: normalized.slice(0, 20),
            content: normalized,
            pinned: false,
            tags: '[]',
            createdAt: now,
            updatedAt: now,
          });
          window.gtaskerMemoBridge?.respondSaveRequest(requestId, { ok: true, id });
        } catch (error) {
          window.gtaskerMemoBridge?.respondSaveRequest(requestId, {
            ok: false,
            error: error instanceof Error ? error.message : 'save failed',
          });
        }
      })();
    });

    return unsubscribe;
  }, []);

  return (
    <I18nProvider>
      <CalendarCountryProvider>
        <div className={`app-startup-frame${startupActive ? ' app-startup-active' : ''}`}>
          <RouterProvider router={router} />
        </div>
        {startupVisible && (
          <StartupAnimation
            appReady={appReady}
            onReveal={revealStartup}
            onComplete={completeStartup}
          />
        )}
        <OnboardingGuide open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      </CalendarCountryProvider>
    </I18nProvider>
  );
}
