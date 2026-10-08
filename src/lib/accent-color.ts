export const ACCENT_COLORS = [
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'blue',
  'purple',
  'white',
] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number];

export const DEFAULT_ACCENT: AccentColor = 'green';
export const ACCENT_STORAGE_KEY = 'interaction-accent';

export function isAccentColor(value: unknown): value is AccentColor {
  return typeof value === 'string' && ACCENT_COLORS.includes(value as AccentColor);
}

export function readAccentPreference(
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined'
    ? null
    : localStorage,
): AccentColor {
  if (!storage) return DEFAULT_ACCENT;

  try {
    const stored = storage.getItem(ACCENT_STORAGE_KEY);
    return isAccentColor(stored) ? stored : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

export function applyAccentPreference(
  value: unknown,
  options: {
    persist?: boolean;
    root?: HTMLElement | null;
    storage?: Pick<Storage, 'setItem'> | null;
  } = {},
): AccentColor {
  const accent = isAccentColor(value) ? value : DEFAULT_ACCENT;
  const root = options.root ?? (typeof document === 'undefined' ? null : document.documentElement);
  const storage = options.storage ?? (typeof localStorage === 'undefined' ? null : localStorage);

  if (root) root.dataset.accent = accent;

  if (options.persist !== false && storage) {
    try {
      storage.setItem(ACCENT_STORAGE_KEY, accent);
    } catch {
      // The visual preference still applies when storage is unavailable.
    }
  }

  return accent;
}
