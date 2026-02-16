/**
 * Notification Service — Cross-platform notification scheduling
 * 
 * This module detects which platform it's running on (Electron, Capacitor/Android,
 * or plain web browser) and uses the appropriate notification API.
 * 
 * Tasks with a `date` and `time` field get a notification scheduled for that moment.
 * Tasks without a time but with a date get a 9:00 AM default notification.
 * Tasks with no date are not scheduled.
 */

// ─── Platform Detection ─────────────────────────────────────────────
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

const isCapacitor = () => {
  return typeof window !== 'undefined' && window.Capacitor !== undefined;
};

// ─── Capacitor dynamic loader ───────────────────────────────────────
// We build the module name at runtime so Rollup/Vite cannot statically
// resolve it. This prevents build errors when the package isn't installed
// (i.e. in Electron or plain web builds). The import only succeeds on
// Android where @capacitor/local-notifications IS installed.
let _cachedLocalNotifications = null;

async function getLocalNotifications() {
  if (_cachedLocalNotifications) return _cachedLocalNotifications;
  try {
    const pkg = ['@capacitor', 'local-notifications'].join('/');
    const mod = await new Function('p', 'return import(p)')(pkg);
    _cachedLocalNotifications = mod.LocalNotifications;
    return _cachedLocalNotifications;
  } catch {
    return null;
  }
}

// ─── Scheduled notification tracker (in-memory) ─────────────────────
const scheduledNotifications = new Map();

// ─── Parse task date+time into a Date object ────────────────────────
function getTaskDateTime(task) {
  if (!task.date) return null;

  const [year, month, day] = task.date.split('-').map(Number);
  let hour = 9, minute = 0;

  if (task.time) {
    const [h, m] = task.time.split(':').map(Number);
    hour = h;
    minute = m;
  }

  return new Date(year, month - 1, day, hour, minute, 0);
}

// ─── Electron Notifications ─────────────────────────────────────────
function scheduleElectron(task, fireAt) {
  const delay = fireAt.getTime() - Date.now();
  if (delay <= 0) return;

  cancelNotification(task.id);

  const timeoutId = setTimeout(() => {
    window.electronAPI.showNotification({
      title: `Task Due: ${task.name}`,
      body: task.description || `Scheduled for ${task.time || 'today'}`,
      taskId: task.id
    });
    scheduledNotifications.delete(task.id);
  }, delay);

  scheduledNotifications.set(task.id, { type: 'timeout', handle: timeoutId });
}

// ─── Capacitor (Android) Notifications ──────────────────────────────
async function scheduleCapacitor(task, fireAt) {
  try {
    const LocalNotifications = await getLocalNotifications();
    if (!LocalNotifications) return;

    cancelNotification(task.id);

    const notifId = Math.abs(task.id % 1000000);

    await LocalNotifications.schedule({
      notifications: [
        {
          title: `Task Due: ${task.name}`,
          body: task.description || `Scheduled for ${task.time || 'today'}`,
          id: notifId,
          schedule: { at: fireAt },
          sound: 'default',
          channelId: 'task-reminders',
          extra: { taskId: task.id }
        }
      ]
    });

    scheduledNotifications.set(task.id, { type: 'capacitor', notifId });
  } catch (err) {
    console.warn('Failed to schedule Android notification:', err);
  }
}

// ─── Web Fallback Notifications (browser Notification API) ──────────
function scheduleWeb(task, fireAt) {
  const delay = fireAt.getTime() - Date.now();
  if (delay <= 0) return;

  cancelNotification(task.id);

  const timeoutId = setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification(`Task Due: ${task.name}`, {
        body: task.description || `Scheduled for ${task.time || 'today'}`,
        icon: '/favicon.ico',
        tag: `task-${task.id}`
      });
    }
    scheduledNotifications.delete(task.id);
  }, delay);

  scheduledNotifications.set(task.id, { type: 'timeout', handle: timeoutId });
}

// ─── Public API ─────────────────────────────────────────────────────

export async function requestNotificationPermission() {
  if (isCapacitor()) {
    try {
      const LocalNotifications = await getLocalNotifications();
      if (!LocalNotifications) return false;

      await LocalNotifications.createChannel({
        id: 'task-reminders',
        name: 'Task Reminders',
        description: 'Notifications for scheduled tasks',
        importance: 4,
        visibility: 1,
        sound: 'default',
        vibration: true
      });

      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (err) {
      console.warn('Capacitor notification permission error:', err);
      return false;
    }
  }

  if (isElectron()) {
    return true;
  }

  if (typeof Notification !== 'undefined') {
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  return false;
}

export function scheduleNotification(task) {
  if (!task || task.completed) return;

  const fireAt = getTaskDateTime(task);
  if (!fireAt || fireAt.getTime() <= Date.now()) return;

  if (isElectron()) {
    scheduleElectron(task, fireAt);
  } else if (isCapacitor()) {
    scheduleCapacitor(task, fireAt);
  } else {
    scheduleWeb(task, fireAt);
  }
}

export async function cancelNotification(taskId) {
  const entry = scheduledNotifications.get(taskId);
  if (!entry) return;

  if (entry.type === 'timeout') {
    clearTimeout(entry.handle);
  } else if (entry.type === 'capacitor') {
    try {
      const LocalNotifications = await getLocalNotifications();
      if (LocalNotifications) {
        await LocalNotifications.cancel({ notifications: [{ id: entry.notifId }] });
      }
    } catch (err) {
      console.warn('Failed to cancel Android notification:', err);
    }
  }

  scheduledNotifications.delete(taskId);
}

export function rescheduleAllNotifications(tasks) {
  for (const [taskId] of scheduledNotifications) {
    cancelNotification(taskId);
  }

  for (const task of tasks) {
    if (!task.completed) {
      scheduleNotification(task);
    }
  }
}

export function getScheduledCount() {
  return scheduledNotifications.size;
}
