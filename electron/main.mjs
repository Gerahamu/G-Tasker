import { app, BrowserWindow, globalShortcut, ipcMain, Notification, shell } from 'electron';
import { execFileSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { platform } from 'node:process';
import { fileURLToPath } from 'node:url';
import { MacOSReminderAgents } from './macos-reminder-agents.mjs';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const appEntry = join(currentDirectory, '..', 'dist-desktop', 'index.html');
const preloadEntry = join(currentDirectory, 'preload.cjs');

let mainWindow = null;
let quickMemoWindow = null;
let hideAppAfterQuickMemo = false;
let memoRequestSequence = 0;
const pendingMemoSaves = new Map();
const isNotificationProcess = process.argv.includes('--reminder-notify');
if (isNotificationProcess && process.platform === 'darwin') {
  // Notification helpers must not register as regular Dock applications while
  // they are being launched by a background LaunchAgent.
  app.setActivationPolicy('accessory');
}
const hasSingleInstanceLock = isNotificationProcess || app.requestSingleInstanceLock();
let reminderAgents = null;

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function decodeReminderPayload() {
  const encoded = getArgValue('--reminder-payload');
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function playNativeReminderSound(payload) {
  if (payload?.soundEnabled === false) return;
  const sounds = {
    beep: '/System/Library/Sounds/Ping.aiff',
    soft: '/System/Library/Sounds/Glass.aiff',
    digital: '/System/Library/Sounds/Tink.aiff',
  };
  const soundPath = sounds[payload?.soundName] || sounds.beep;
  const volume = Math.max(0, Math.min(1, Number(payload?.volume) || 0.7));
  try {
    spawn('/usr/bin/afplay', ['-v', String(volume), soundPath], {
      detached: true,
      stdio: 'ignore',
    }).unref();
  } catch {}
}

function openMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  createMainWindow({ skipStartupAnimation: true });
}

function runNotificationProcess() {
  const payload = decodeReminderPayload();
  const label = getArgValue('--reminder-label');
  app.whenReady().then(() => {
    if (process.platform === 'darwin') {
      app.setActivationPolicy('accessory');
      app.dock?.hide();
    }
    const validDate = typeof payload?.validDate === 'string' ? payload.validDate : null;
    const shouldShow = !validDate || validDate === localDateString();
    const notification =
      Notification.isSupported() && shouldShow
        ? new Notification({
            title: typeof payload?.title === 'string' ? payload.title : 'G-Tasker 提醒',
            body: typeof payload?.body === 'string' ? payload.body : '有一条提醒',
            silent: true,
          })
        : null;

    notification?.on('click', () => {
      spawn(app.getPath('exe'), [], { detached: true, stdio: 'ignore' }).unref();
    });
    if (shouldShow) notification?.show();
    if (shouldShow) playNativeReminderSound(payload);

    // Keep the short-lived notification helper alive long enough for macOS to
    // deliver the notification, then unload one-shot LaunchAgents.
    setTimeout(() => {
      if (label && process.platform === 'darwin') {
        try {
          execFileSync('launchctl', ['bootout', `gui/${process.getuid()}/${label}`], {
            stdio: 'ignore',
          });
        } catch {}
      }
      app.quit();
    }, 15000);
  });
}

function hideQuickMemoWindow() {
  if (!quickMemoWindow || quickMemoWindow.isDestroyed()) return;
  quickMemoWindow.webContents.send('quick-memo:reset');
  if (process.platform === 'darwin' && hideAppAfterQuickMemo) {
    hideAppAfterQuickMemo = false;
    app.hide();
    quickMemoWindow.hide();
    return;
  }
  quickMemoWindow.hide();
}

function prepareMainWindowForQuickMemo() {
  if (process.platform !== 'darwin' || !mainWindow || mainWindow.isDestroyed()) return;

  hideAppAfterQuickMemo = !mainWindow.isFocused();
  if (hideAppAfterQuickMemo) {
    mainWindow.hide();
  }
}

function createMainWindow({ skipStartupAnimation = false } = {}) {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'G-Tasker',
    frame: true,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 18, y: 8 },
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: preloadEntry,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  void mainWindow.loadFile(
    appEntry,
    skipStartupAnimation ? { query: { skipStartup: '1' } } : undefined,
  );
  return mainWindow;
}

function toggleQuickMemoWindow() {
  if (quickMemoWindow && !quickMemoWindow.isDestroyed()) {
    if (quickMemoWindow.isVisible()) {
      hideQuickMemoWindow();
      return;
    }

    prepareMainWindowForQuickMemo();
    if (quickMemoWindow.isMinimized()) quickMemoWindow.restore();
    quickMemoWindow.show();
    quickMemoWindow.focus();
    quickMemoWindow.webContents.send('quick-memo:activate');
    return;
  }

  quickMemoWindow = new BrowserWindow({
    width: 440,
    height: 162,
    minWidth: 360,
    minHeight: 140,
    maxWidth: 560,
    maxHeight: 320,
    show: false,
    frame: false,
    transparent: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    hasShadow: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    skipTaskbar: true,
    alwaysOnTop: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: preloadEntry,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  quickMemoWindow.on('closed', () => {
    quickMemoWindow = null;
  });
  quickMemoWindow.on('blur', () => {
    if (!quickMemoWindow || quickMemoWindow.isDestroyed() || !quickMemoWindow.isVisible()) return;
    hideQuickMemoWindow();
  });
  quickMemoWindow.webContents.on('before-input-event', (event, input) => {
    const shouldHide =
      input.type === 'keyDown' &&
      (input.key === 'Escape' ||
        (process.platform === 'darwin' && input.control && input.code === 'KeyM') ||
        (process.platform !== 'darwin' && input.alt && input.code === 'KeyM'));

    if (shouldHide) {
      event.preventDefault();
      hideQuickMemoWindow();
    }
  });
  quickMemoWindow.once('ready-to-show', () => {
    prepareMainWindowForQuickMemo();
    quickMemoWindow?.center();
    quickMemoWindow?.show();
    quickMemoWindow?.focus();
  });
  void quickMemoWindow.loadFile(appEntry, { query: { quickMemo: '1' } });
}

function requestMemoSave(content) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return Promise.reject(new Error('Main window is unavailable'));
  }

  const requestId = `quick-memo-${Date.now()}-${memoRequestSequence++}`;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingMemoSaves.delete(requestId);
      reject(new Error('Memo save timed out'));
    }, 10000);

    pendingMemoSaves.set(requestId, { resolve, reject, timeout });
    const sendRequest = () => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        clearTimeout(timeout);
        pendingMemoSaves.delete(requestId);
        reject(new Error('Main window is unavailable'));
        return;
      }
      mainWindow.webContents.send('quick-memo:save-request', { requestId, content });
    };

    if (mainWindow.webContents.isLoading())
      mainWindow.webContents.once('did-finish-load', sendRequest);
    else sendRequest();
  });
}

ipcMain.handle('quick-memo:save', (_event, content) => {
  const normalized = typeof content === 'string' ? content.trim() : '';
  if (!normalized) return Promise.reject(new Error('Memo content is empty'));
  return requestMemoSave(normalized);
});

ipcMain.handle('quick-memo:hide', (event) => {
  if (BrowserWindow.fromWebContents(event.sender) === quickMemoWindow) {
    hideQuickMemoWindow();
  }
});

ipcMain.on('quick-memo:save-result', (_event, requestId, result) => {
  const pending = pendingMemoSaves.get(requestId);
  if (!pending) return;

  clearTimeout(pending.timeout);
  pendingMemoSaves.delete(requestId);
  if (result?.ok) pending.resolve(result);
  else pending.reject(new Error(result?.error || 'Memo save failed'));
});

ipcMain.handle('reminders:sync-schedule', async (_event, schedule) => {
  if (!reminderAgents) return { loaded: 0, failed: 0 };
  return reminderAgents.sync(schedule);
});

ipcMain.handle('reminders:snooze', async (_event, event, minutes) => {
  await reminderAgents?.snooze(event, minutes);
});

if (hasSingleInstanceLock && !isNotificationProcess) {
  app.on('second-instance', (_event, commandLine) => {
    if (commandLine.includes('--reminder-notify')) return;
    openMainWindow();
  });

  app.whenReady().then(async () => {
    if (process.platform === 'darwin' && app.isPackaged) {
      reminderAgents = new MacOSReminderAgents({
        executable: app.getPath('exe'),
        userId: process.getuid?.(),
      });
      await reminderAgents.initialize();
    }

    createMainWindow();

    const accelerator = process.platform === 'darwin' ? 'Control+M' : 'Alt+M';
    if (!globalShortcut.register(accelerator, toggleQuickMemoWindow)) {
      console.error(`Failed to register global shortcut: ${accelerator}`);
    }

    app.on('activate', () => {
      // Clicking the Dock icon must always surface the main window. Reuse the
      // same logic as the second-instance handler so that a closed main window
      // (mainWindow === null while the hidden Quick Memo window still exists)
      // is recreated instead of silently doing nothing.
      openMainWindow();
    });
  });
} else if (isNotificationProcess && hasSingleInstanceLock) {
  runNotificationProcess();
} else {
  app.quit();
}

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
