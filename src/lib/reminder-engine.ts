// ════ Unified Reminder Engine ════
// Handles notifications, audio, and reminder management for countdowns & alarms

import type { ReminderEvent, ActiveReminder } from '../lib/clock-types';
import { getBrowserTabId } from '../lib/time-utils';

const REMINDER_CHANNEL = 'g-tasker-reminders';

type ReminderCallback = (event: ReminderEvent) => void;
type DismissCallback = (eventId: string) => void;

class ReminderEngine {
  private activeReminders: Map<string, ActiveReminder> = new Map();
  private audioContext: AudioContext | null = null;
  private currentAudio: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private channel: BroadcastChannel | null = null;
  private tabId: string;

  // Callbacks
  private onShowCallbacks: Set<ReminderCallback> = new Set();
  private onDismissCallbacks: Set<DismissCallback> = new Set();

  constructor() {
    this.tabId = getBrowserTabId();

    try {
      this.channel = new BroadcastChannel(REMINDER_CHANNEL);
      this.channel.onmessage = (ev: MessageEvent) => {
        const { type, event, tabId } = ev.data || {};
        if (tabId === this.tabId) return;
        if (type === 'trigger' && event) {
          // Another tab is handling this — don't duplicate
          this.markHandled(event.id);
        }
      };
    } catch {
      // BroadcastChannel not supported
    }
  }

  private markHandled(eventId: string) {
    const key = `reminder-handled-${eventId}`;
    try {
      localStorage.setItem(key, '1');
    } catch {
      // BroadcastChannel is optional in older WebViews.
    }
  }

  private isHandled(eventId: string): boolean {
    const key = `reminder-handled-${eventId}`;
    try {
      if (localStorage.getItem(key)) return true;
      return false;
    } catch {
      return false;
    }
  }

  trigger(event: ReminderEvent) {
    if (this.isHandled(event.id)) return;
    this.markHandled(event.id);

    const active: ActiveReminder = {
      event,
      audioStarted: false,
      dismissed: false,
    };
    this.activeReminders.set(event.id, active);

    // Notify other tabs
    try {
      this.channel?.postMessage({ type: 'trigger', event, tabId: this.tabId });
    } catch {
      // localStorage may be unavailable in restricted browser contexts.
    }

    // Show UI
    this.onShowCallbacks.forEach((cb) => cb(event));
  }

  startAudio(event: ReminderEvent) {
    const active = this.activeReminders.get(event.id);
    if (!active || active.audioStarted) return;
    active.audioStarted = true;

    this.playBeep(event.volume, event.soundName);
  }

  private async playBeep(volume: number, soundName: string) {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Stop any currently playing audio
      this.stopAudioInternal();

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
      this.gainNode.connect(this.audioContext.destination);

      const sound =
        soundName === 'soft'
          ? { type: 'sine' as OscillatorType, frequency: 660 }
          : soundName === 'digital'
            ? { type: 'square' as OscillatorType, frequency: 1046.5 }
            : { type: 'sine' as OscillatorType, frequency: 880 };

      // Create a short, repeatable reminder sound.
      const osc = this.audioContext.createOscillator();
      osc.type = sound.type;
      osc.frequency.value = sound.frequency;
      osc.connect(this.gainNode);

      // Pulse the beep: 200ms on, 300ms off, repeating
      const now = this.audioContext.currentTime;
      const beepDuration = 0.2;
      const beepInterval = 0.5;
      const totalDuration = 10; // 10 seconds max per trigger

      for (let t = 0; t < totalDuration; t += beepInterval) {
        this.gainNode.gain.setValueAtTime(volume, now + t);
        this.gainNode.gain.setValueAtTime(volume, now + t + beepDuration);
        this.gainNode.gain.setValueAtTime(0, now + t + beepDuration + 0.01);
      }

      osc.start(now);
      osc.stop(now + totalDuration);
      this.currentAudio = osc as unknown as AudioBufferSourceNode;

      osc.onended = () => {
        this.currentAudio = null;
        this.activeReminders.forEach((rem) => {
          rem.audioStarted = false;
        });
      };
    } catch {
      // Audio not available
    }
  }

  private stopAudioInternal() {
    try {
      this.currentAudio?.stop();
    } catch {
      // Stopping an already-ended oscillator is harmless.
    }
    this.currentAudio = null;
  }

  stopAudio() {
    this.stopAudioInternal();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
      this.gainNode = null;
    }
  }

  dismiss(eventId: string) {
    const active = this.activeReminders.get(eventId);
    if (!active) return;
    active.dismissed = true;
    this.activeReminders.delete(eventId);

    if (this.activeReminders.size === 0) {
      this.stopAudio();
    }

    this.onDismissCallbacks.forEach((cb) => cb(eventId));
  }

  snooze(eventId: string, _snoozeMinutes: number) {
    const active = this.activeReminders.get(eventId);
    if (!active) return;
    const event = active.event;
    this.dismiss(eventId);
    const delay = Math.max(1, _snoozeMinutes || 9) * 60_000;
    window.setTimeout(() => {
      this.trigger({
        ...event,
        id: `snooze-${event.id}-${Date.now()}`,
        triggeredAt: new Date().toISOString(),
        snoozeEnabled: false,
      });
    }, delay);
  }

  hasActiveReminders(): boolean {
    return this.activeReminders.size > 0;
  }

  getActiveReminders(): ActiveReminder[] {
    return Array.from(this.activeReminders.values()).filter((r) => !r.dismissed);
  }

  onShow(cb: ReminderCallback) {
    this.onShowCallbacks.add(cb);
    return () => {
      this.onShowCallbacks.delete(cb);
    };
  }

  onDismiss(cb: DismissCallback) {
    this.onDismissCallbacks.add(cb);
    return () => {
      this.onDismissCallbacks.delete(cb);
    };
  }

  /** Send a browser notification if permission granted */
  sendSystemNotification(title: string, body: string) {
    if (window.gtaskerReminders?.nativeNotifications) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, icon: '/favicon.ico', tag: 'g-tasker-reminder' });
    } catch {
      // Notification APIs can be unavailable or denied by the host.
    }
  }

  destroy() {
    this.stopAudio();
    this.channel?.close();
  }
}

export const reminderEngine = new ReminderEngine();
