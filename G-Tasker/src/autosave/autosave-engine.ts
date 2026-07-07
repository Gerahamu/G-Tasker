import { useTaskStore } from '../stores/task-store';
import { useListStore } from '../stores/list-store';
import { AUTOSAVE_INTERVAL_MS } from '../lib/constants';

type StoreWithSave = {
  getState: () => {
    dirtyIds?: Set<number>;
    dirtyTagIds?: Set<number>;
    saveDirtyTasks?: () => Promise<void>;
    saveDirtyLists?: () => Promise<void>;
    saveDirtyTags?: () => Promise<void>;
  };
};

const STORES: StoreWithSave[] = [
  useTaskStore as StoreWithSave,
  useListStore as StoreWithSave,
];

let periodicTimer: ReturnType<typeof setInterval> | null = null;

function flushAllStores() {
  for (const store of STORES) {
    const state = store.getState();
    const dirtySet =
      state.dirtyIds ?? state.dirtyTagIds ?? new Set();
    if (dirtySet.size > 0 && state.saveDirtyTasks) {
      state.saveDirtyTasks();
    }
    if (dirtySet.size > 0 && state.saveDirtyLists) {
      state.saveDirtyLists();
    }
    if (dirtySet.size > 0 && state.saveDirtyTags) {
      state.saveDirtyTags();
    }
  }
}

function startPeriodicAutoSave() {
  if (periodicTimer) clearInterval(periodicTimer);
  periodicTimer = setInterval(() => {
    flushAllStores();
  }, AUTOSAVE_INTERVAL_MS);
}

function setupExitSave() {
  const handler = () => {
    flushAllStores();
  };
  window.addEventListener('pagehide', handler);
  window.addEventListener('beforeunload', handler);
}

function setupVisibilitySave() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAllStores();
    }
  });
}

export function initAutoSave() {
  startPeriodicAutoSave();
  setupExitSave();
  setupVisibilitySave();
}

export function stopAutoSave() {
  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
  }
}
