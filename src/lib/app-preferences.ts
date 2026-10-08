function readPreference(key: string, fallback: string): string {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : fallback;
  } catch {
    return raw;
  }
}

function initTheme() {
  const mode = readPreference('theme-mode', 'system');

  if (mode === 'dark') document.documentElement.classList.add('dark');
  else if (mode === 'light') document.documentElement.classList.remove('dark');
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
}

function initFontSize() {
  const size = readPreference('font-size', 'normal');
  document.documentElement.classList.remove(
    'font-scale-small',
    'font-scale-normal',
    'font-scale-large',
  );
  document.documentElement.classList.add(`font-scale-${size}`);
}

export function initializeAppPreferences() {
  initTheme();
  initFontSize();
}
