const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, listener) {
  const handler = (_event, payload) => listener(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld('gtaskerQuickMemo', {
  save: (content) => ipcRenderer.invoke('quick-memo:save', content),
  hide: () => ipcRenderer.invoke('quick-memo:hide'),
  onActivate: (listener) => subscribe('quick-memo:activate', listener),
  onReset: (listener) => subscribe('quick-memo:reset', listener),
});

contextBridge.exposeInMainWorld('gtaskerMemoBridge', {
  onSaveRequest: (listener) => subscribe('quick-memo:save-request', listener),
  respondSaveRequest: (requestId, result) =>
    ipcRenderer.send('quick-memo:save-result', requestId, result),
});

contextBridge.exposeInMainWorld('gtaskerReminders', {
  // Packaged macOS builds install LaunchAgents which invoke the same app's
  // notification-only process even when the main window is closed.
  nativeNotifications: process.platform === 'darwin' && !process.defaultApp,
  syncSchedule: (schedule) => ipcRenderer.invoke('reminders:sync-schedule', schedule),
  snooze: (event, minutes) => ipcRenderer.invoke('reminders:snooze', event, minutes),
});
