// Browser push/local notification helpers.
// All functions are no-ops on the server or in unsupported browsers.

import icon192 from "../assets/icon-192.png.asset.json";

export function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export type PermissionState = "granted" | "denied" | "default";

export function getPermission(): PermissionState {
  if (!isSupported()) return "denied";
  return Notification.permission as PermissionState;
}

export async function requestPermission(): Promise<PermissionState> {
  if (!isSupported()) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission as PermissionState;
  }
  try {
    const result = await Notification.requestPermission();
    return result as PermissionState;
  } catch (err) {
    console.error("[pushNotifications] requestPermission error", err);
    return "denied";
  }
}

export function sendLocalNotification(title: string, body: string, icon?: string): void {
  if (!isSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: icon ?? "/icon-192.png" });
  } catch (err) {
    console.error("[pushNotifications] sendLocalNotification error", err);
  }
}

export interface ReminderLesson {
  id?: string;
  lesson_date: string; // YYYY-MM-DD
  lesson_time: string; // HH:MM[:SS]
  duration_minutes?: number | null;
  pupils?: { name?: string | null } | null;
}

function lessonDateTime(l: ReminderLesson): Date {
  const t = (l.lesson_time ?? "00:00:00").slice(0, 8);
  const time = t.length === 5 ? `${t}:00` : t;
  return new Date(`${l.lesson_date}T${time}`);
}

function formatHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDuration(mins: number | null | undefined): string {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/**
 * Schedules a local notification 1 hour before lesson_date + lesson_time.
 * Returns a cleanup function that cancels the pending notification.
 */
export function scheduleLessonReminder(lesson: ReminderLesson): () => void {
  if (!isSupported() || Notification.permission !== "granted") return () => {};

  const lessonAt = lessonDateTime(lesson);
  const fireAt = lessonAt.getTime() - 60 * 60 * 1000; // 1 hour before
  const delay = fireAt - Date.now();
  if (delay <= 0) return () => {};
  // setTimeout uses a 32-bit int; cap at ~24 days.
  if (delay > 2_147_000_000) return () => {};

  const title = "Lesson in 1 hour";
  const pupil = lesson.pupils?.name ?? "Pupil";
  const time = formatHM(lessonAt);
  const dur = formatDuration(lesson.duration_minutes ?? null);
  const body = [pupil, time, dur].filter(Boolean).join(" · ");

  const handle = window.setTimeout(() => {
    sendLocalNotification(title, body);
  }, delay);

  return () => window.clearTimeout(handle);
}
