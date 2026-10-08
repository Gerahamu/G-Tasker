export type SavedLanguage = 'zh' | 'en' | 'ja';

export function initializeLanguage(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  systemLanguage: string,
): SavedLanguage {
  try {
    const saved = storage.getItem('app-language');
    if (saved === 'zh' || saved === 'en' || saved === 'ja') return saved;
  } catch {
    // Restricted storage still allows choosing an initial in-memory language.
  }
  const locale = systemLanguage.toLowerCase();
  const detected = locale.startsWith('ja') ? 'ja' : locale.startsWith('en') ? 'en' : 'zh';
  try {
    storage.setItem('app-language', detected);
  } catch {
    // Persistence is unavailable, but the app remains usable for this session.
  }
  return detected;
}
