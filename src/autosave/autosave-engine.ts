import { useTaskStore } from '../stores/task-store';
import { useListStore } from '../stores/list-store';
import { useUIStore } from '../stores/ui-store';
import { AUTOSAVE_INTERVAL_MS } from '../lib/constants';

let cleanup: (() => void) | null = null;
let reportedFailure = false;

export function reportSaveFailure() {
  if (reportedFailure) return;
  reportedFailure = true;
  let language: string = useUIStore.getState().language;
  try { language = localStorage.getItem('app-language') || language; } catch { /* storage unavailable */ }
  const message = language === 'en'
    ? 'Could not save changes. Please keep this window open and try again.'
    : language === 'ja'
      ? '変更を保存できませんでした。この画面を閉じずに再試行してください。'
      : '修改尚未保存成功，请保持窗口打开并重试。';
  useUIStore.getState().addToast(message, 'error');
}

export async function flushAllStores(): Promise<void> {
  const results = await Promise.allSettled([
    useTaskStore.getState().saveDirtyTasks(),
    useListStore.getState().saveDirtyLists(),
  ]);
  const failure = results.find(result => result.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
  reportedFailure = false;
}

function saveInBackground() {
  void flushAllStores().catch(reportSaveFailure);
}

function hasUnsavedChanges() {
  return useTaskStore.getState().dirtyIds.size > 0 || useListStore.getState().dirtyIds.size > 0;
}

export function initAutoSave() {
  stopAutoSave();
  const unsubscribeTasks = useTaskStore.subscribe((state, previous) => {
    if (state.dirtyIds !== previous.dirtyIds && state.dirtyIds.size > 0) saveInBackground();
  });
  const unsubscribeLists = useListStore.subscribe((state, previous) => {
    if (state.dirtyIds !== previous.dirtyIds && state.dirtyIds.size > 0) saveInBackground();
  });
  const timer = setInterval(saveInBackground, AUTOSAVE_INTERVAL_MS);
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (!hasUnsavedChanges()) return;
    saveInBackground();
    // Browsers cannot await IndexedDB in beforeunload; warn instead of claiming success.
    event.preventDefault();
    event.returnValue = '';
  };
  const visibilityChange = () => {
    if (document.visibilityState === 'hidden') saveInBackground();
  };
  window.addEventListener('beforeunload', beforeUnload);
  window.addEventListener('pagehide', saveInBackground);
  document.addEventListener('visibilitychange', visibilityChange);
  cleanup = () => {
    clearInterval(timer);
    unsubscribeTasks();
    unsubscribeLists();
    window.removeEventListener('beforeunload', beforeUnload);
    window.removeEventListener('pagehide', saveInBackground);
    document.removeEventListener('visibilitychange', visibilityChange);
  };
  saveInBackground();
}

export function stopAutoSave() {
  cleanup?.();
  cleanup = null;
}
