import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { initializeAppPreferences } from './lib/app-preferences';
import { applyAccentPreference } from './lib/accent-color';

// Keep the interaction accent monochrome: black in light mode, white in dark mode.
applyAccentPreference('white', { persist: false });
initializeAppPreferences();

async function bootstrap() {
  const root = createRoot(document.getElementById('root')!);
  const isQuickMemo = new URLSearchParams(window.location.search).has('quickMemo');

  if (isQuickMemo) {
    const { QuickMemoApp } = await import('./components/quick-memo/QuickMemoApp');
    root.render(
      <StrictMode>
        <QuickMemoApp />
      </StrictMode>,
    );
    return;
  }

  const { default: App } = await import('./App');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
