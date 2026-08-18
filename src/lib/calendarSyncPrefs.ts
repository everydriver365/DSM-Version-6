/**
 * Calendar sync direction preferences.
 *
 * Persisted locally so the Calendar sync page toggles survive reloads, and read
 * by every place that pushes a lesson to Google Calendar.
 */

import { supabase } from "@/lib/supabaseClient";

const IMPORT_KEY = "dsm.calendarSync.importEnabled";
const PUSH_KEY = "dsm.calendarSync.pushEnabled";

function read(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(key) !== "false";
  } catch {
    return true;
  }
}

function write(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "true" : "false");
  } catch {
    /* ignore */
  }
}

export function getImportEnabled(): boolean {
  return read(IMPORT_KEY);
}

export function setImportEnabled(value: boolean) {
  write(IMPORT_KEY, value);
}

export function getPushEnabled(): boolean {
  return read(PUSH_KEY);
}

export function setPushEnabled(value: boolean) {
  write(PUSH_KEY, value);
}

type PushAction = "push" | "update" | "delete" | "upsert";

/**
 * Fire-and-forget push of a lesson to Google Calendar.
 * No-ops when the instructor has turned "Push DSM lessons to Google" off.
 */
export function pushLessonToGoogle(
  body: { lesson_id: string; instructor_id: string; action: PushAction },
) {
  if (!getPushEnabled()) return;
  void supabase.functions.invoke("google-calendar-sync", { body });
}
