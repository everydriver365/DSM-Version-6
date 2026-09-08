// Double-booking safety. Uses the same diary sources as the availability
// engine (lessons, blocking calendar events, recurring blocks, time off,
// working hours, travel buffer) and reports clashes before a lesson is saved.
//
// Pure logic lives in `evaluateConflicts` so it can be unit tested; the
// Supabase reads live in `checkLessonConflict`.

import { supabase } from "@/lib/supabaseClient";
import { localDateStr, localTimeStr } from "@/lib/gapDetection";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function hmToMin(t?: string | null): number {
  if (!t) return 0;
  const [h, m] = String(t).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minToHm(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export type Conflict = { kind: string; label: string };

export type ConflictResult = { blocking: Conflict[]; warnings: Conflict[] };

export type EvaluateConflictsParams = {
  dateStr: string;
  startMins: number;
  endMins: number;
  /** Other lessons on the same date (the lesson being edited already removed). */
  dayLessons: Array<{
    lesson_time: string | null;
    duration_minutes: number | null;
    status?: string | null;
    pupil_id?: string | null;
    pupilName?: string | null;
    bufferAfterMinutes?: number | null;
  }>;
  /** Blocking calendar events overlapping this date (Google + ICS). */
  calendarBlocks: Array<{
    start_datetime: string;
    end_datetime: string;
    title?: string | null;
    is_all_day?: boolean | null;
    blocks_availability?: boolean | null;
  }>;
  recurringBlocks: Array<{
    day_of_week: string;
    start_time: string;
    end_time: string;
    title?: string | null;
    is_active?: boolean | null;
  }>;
  dayTimeOff: Array<{
    start_time?: string | null;
    end_time?: string | null;
    all_day?: boolean | null;
  }>;
  /** Working window for this weekday, or null when it is not a working day. */
  dayStart?: string | null;
  dayEnd?: string | null;
  isWorkingDay: boolean;
  bufferAfterMinutes: number;
  /** Pupil being booked — used to catch the same pupil booked twice. */
  pupilId?: string | null;
};

/** Overlap test on half-open intervals. */
function overlaps(aS: number, aE: number, bS: number, bE: number): boolean {
  return aS < bE && bS < aE;
}

export function evaluateConflicts(p: EvaluateConflictsParams): ConflictResult {
  const blocking: Conflict[] = [];
  const warnings: Conflict[] = [];
  const buffer = Math.max(0, Number(p.bufferAfterMinutes) || 0);
  const { startMins, endMins } = p;

  // --- Time off ---
  for (const t of p.dayTimeOff || []) {
    if (t.all_day) {
      blocking.push({ kind: "time_off", label: "You're marked as off on this date" });
      continue;
    }
    if (!t.start_time || !t.end_time) continue;
    const s = hmToMin(t.start_time);
    const e = hmToMin(t.end_time);
    if (overlaps(startMins, endMins, s, e)) {
      blocking.push({
        kind: "time_off",
        label: `You're marked as off ${minToHm(s)}–${minToHm(e)}`,
      });
    }
  }

  // --- Other lessons ---
  for (const l of p.dayLessons || []) {
    if (!l.lesson_time) continue;
    if (String(l.status || "").toLowerCase() === "cancelled") continue;
    const s = hmToMin(l.lesson_time);
    const e = s + (l.duration_minutes ?? 60);
    const name = l.pupilName || "another booking";
    const when = `${minToHm(s)}–${minToHm(e)}`;
    if (overlaps(startMins, endMins, s, e)) {
      blocking.push({ kind: "lesson", label: `Clashes with ${name} ${when}` });
      continue;
    }
    if (p.pupilId && l.pupil_id && l.pupil_id === p.pupilId) {
      // Same pupil, no overlap — nothing to report.
    }
    // Travel time either side.
    const buf =
      l.bufferAfterMinutes != null ? Math.max(0, Number(l.bufferAfterMinutes) || 0) : buffer;
    if (buf > 0 && overlaps(startMins - buf, endMins + buf, s, e)) {
      warnings.push({
        kind: "buffer",
        label: `Less than ${buf} min travel time around ${name} ${when}`,
      });
    }
  }

  // --- Calendar events (Google / ICS) ---
  for (const b of p.calendarBlocks || []) {
    if (b.blocks_availability === false) continue;
    if (b.is_all_day) {
      blocking.push({
        kind: "calendar",
        label: `Clashes with ${b.title || "a calendar event"} (all day)`,
      });
      continue;
    }
    const sDate = localDateStr(b.start_datetime);
    const eDate = localDateStr(b.end_datetime);
    const s = sDate < p.dateStr ? 0 : hmToMin(localTimeStr(b.start_datetime));
    const e = eDate > p.dateStr ? 1440 : hmToMin(localTimeStr(b.end_datetime));
    if (e <= s) continue;
    const when = `${minToHm(s)}–${minToHm(e)}`;
    if (overlaps(startMins, endMins, s, e)) {
      blocking.push({
        kind: "calendar",
        label: `Clashes with ${b.title || "a calendar event"} ${when}`,
      });
    } else if (buffer > 0 && overlaps(startMins - buffer, endMins + buffer, s, e)) {
      warnings.push({
        kind: "buffer",
        label: `Less than ${buffer} min travel time around ${b.title || "a calendar event"} ${when}`,
      });
    }
  }

  // --- Recurring blocks ---
  const dayName = DAY_NAMES[new Date(`${p.dateStr}T12:00:00`).getDay()];
  for (const r of p.recurringBlocks || []) {
    if (r.is_active === false) continue;
    if (r.day_of_week !== dayName) continue;
    const s = hmToMin(r.start_time);
    const e = hmToMin(r.end_time);
    if (overlaps(startMins, endMins, s, e)) {
      blocking.push({
        kind: "recurring",
        label: `Falls inside a blocked slot (${r.title || `${minToHm(s)}–${minToHm(e)}`})`,
      });
    }
  }

  // --- Working hours (warning only) ---
  if (!p.isWorkingDay) {
    warnings.push({ kind: "hours", label: "Outside your normal working days" });
  } else {
    const ws = hmToMin(p.dayStart || "09:00");
    const we = hmToMin(p.dayEnd || "18:00");
    if (startMins < ws || endMins > we) {
      warnings.push({
        kind: "hours",
        label: `Outside your working hours (${minToHm(ws)}–${minToHm(we)})`,
      });
    }
  }

  return { blocking, warnings };
}

export type CheckLessonConflictParams = {
  instructorId: string;
  pupilId?: string | null;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM or HH:MM:SS */
  time: string;
  durationMinutes: number;
  /** Lesson being edited — excluded from the clash check. */
  excludeLessonId?: string | null;
};

/** Reads the diary for one day and reports clashes. Throws on query errors. */
export async function checkLessonConflict(
  p: CheckLessonConflictParams,
): Promise<ConflictResult> {
  const dateStr = p.date;
  const startMins = hmToMin(p.time);
  const endMins = startMins + (Number(p.durationMinutes) || 60);

  const instructorRes = await supabase
    .from("instructors")
    .select(
      "working_hours_start, working_hours_end, working_days, per_day_hours, lesson_buffer_after",
    )
    .eq("id", p.instructorId)
    .maybeSingle();
  if (instructorRes.error) throw new Error(instructorRes.error.message);

  const instr = (instructorRes.data ?? {}) as {
    working_hours_start: string | null;
    working_hours_end: string | null;
    working_days: string[] | null;
    per_day_hours: Record<string, { active?: boolean; start?: string; end?: string }> | null;
    lesson_buffer_after: number | null;
  };

  const dayName = DAY_NAMES[new Date(`${dateStr}T12:00:00`).getDay()];
  const dayCfg = instr.per_day_hours?.[dayName];
  const workingDays = instr.working_days ?? [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ];
  const isWorkingDay = dayCfg ? dayCfg.active !== false : workingDays.includes(dayName);
  const dayStart = (dayCfg?.start || instr.working_hours_start || "09:00").slice(0, 5);
  const dayEnd = (dayCfg?.end || instr.working_hours_end || "18:00").slice(0, 5);
  const bufferAfter = Number(instr.lesson_buffer_after ?? 0) || 0;

  const nextDay = new Date(`${dateStr}T00:00:00`);
  nextDay.setDate(nextDay.getDate() + 1);

  const [lessonsRes, blocksRes, recurringRes, timeOffRes] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, lesson_time, duration_minutes, status, pupil_id")
      .eq("instructor_id", p.instructorId)
      .is("deleted_at", null)
      .eq("lesson_date", dateStr),
    supabase
      .from("calendar_blocks")
      .select("start_datetime, end_datetime, title, is_all_day, blocks_availability")
      .eq("instructor_id", p.instructorId)
      .eq("source", "external_calendar")
      .gt("end_datetime", new Date(`${dateStr}T00:00:00`).toISOString())
      .lt("start_datetime", nextDay.toISOString()),
    supabase
      .from("instructor_recurring_blocks")
      .select("day_of_week, start_time, end_time, is_active")
      .eq("instructor_id", p.instructorId),
    supabase
      .from("instructor_time_off")
      .select("start_date, end_date, start_time, end_time, all_day")
      .eq("instructor_id", p.instructorId)
      .lte("start_date", dateStr)
      .gte("end_date", dateStr),
  ]);

  if (lessonsRes.error) throw new Error(lessonsRes.error.message);
  if (blocksRes.error) throw new Error(blocksRes.error.message);
  if (recurringRes.error) throw new Error(recurringRes.error.message);
  if (timeOffRes.error) throw new Error(timeOffRes.error.message);

  const rawLessons = (lessonsRes.data ?? []) as Array<{
    id: string;
    lesson_time: string | null;
    duration_minutes: number | null;
    status: string | null;
    pupil_id: string | null;
  }>;
  const otherLessons = rawLessons.filter((l) => l.id !== p.excludeLessonId);

  // Names for the clash message.
  const pupilIds = Array.from(
    new Set(otherLessons.map((l) => l.pupil_id).filter(Boolean) as string[]),
  );
  const names = new Map<string, string>();
  if (pupilIds.length > 0) {
    const namesRes = await supabase.from("pupils").select("id, name").in("id", pupilIds);
    for (const row of (namesRes.data ?? []) as Array<{ id: string; name: string | null }>) {
      if (row.name) names.set(row.id, row.name);
    }
  }

  return evaluateConflicts({
    dateStr,
    startMins,
    endMins,
    dayLessons: otherLessons.map((l) => ({
      lesson_time: l.lesson_time,
      duration_minutes: l.duration_minutes,
      status: l.status,
      pupil_id: l.pupil_id,
      pupilName: l.pupil_id ? names.get(l.pupil_id) ?? null : null,
    })),
    calendarBlocks: (blocksRes.data ?? []) as EvaluateConflictsParams["calendarBlocks"],
    recurringBlocks: (recurringRes.data ?? []) as EvaluateConflictsParams["recurringBlocks"],
    dayTimeOff: ((timeOffRes.data ?? []) as Array<{
      start_time: string | null;
      end_time: string | null;
      all_day: boolean | null;
    }>).map((t) => ({ start_time: t.start_time, end_time: t.end_time, all_day: t.all_day })),
    dayStart,
    dayEnd,
    isWorkingDay,
    bufferAfterMinutes: bufferAfter,
    pupilId: p.pupilId ?? null,
  });
}

/** True when a Supabase error is the database double-booking guard. */
export function isDoubleBookingError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  return e.code === "23P01" || /lessons_no_overlap/i.test(e.message || "");
}

export const DOUBLE_BOOKING_MESSAGE =
  "That time clashes with another lesson in your diary.";

/**
 * Run the clash check for a save. Blocking clashes stop the save; softer
 * warnings ask the user whether to book anyway.
 */
export async function guardLessonSave(
  p: CheckLessonConflictParams,
): Promise<{ ok: boolean; message?: string }> {
  let result: ConflictResult;
  try {
    result = await checkLessonConflict(p);
  } catch (e) {
    // Never block a save because the check itself failed — the database
    // constraint is still the final safety net.
    console.warn("[bookingConflicts] check failed", e);
    return { ok: true };
  }

  if (result.blocking.length > 0) {
    return { ok: false, message: result.blocking.map((c) => c.label).join(". ") };
  }

  if (result.warnings.length > 0 && typeof window !== "undefined") {
    const proceed = window.confirm(
      `${result.warnings.map((c) => c.label).join("\n")}\n\nBook anyway?`,
    );
    if (!proceed) return { ok: false };
  }

  return { ok: true };
}

/**
 * For a recurring series: split candidate dates into ones that are free and
 * ones that clash with an existing lesson. One query, lessons only — the
 * database guard still protects anything this misses.
 */
export async function splitClashingDates(params: {
  instructorId: string;
  dates: string[];
  time: string;
  durationMinutes: number;
}): Promise<{ free: string[]; clashing: string[] }> {
  const { instructorId, dates } = params;
  if (dates.length === 0) return { free: [], clashing: [] };
  const startMins = hmToMin(params.time);
  const endMins = startMins + (Number(params.durationMinutes) || 60);
  const sorted = [...dates].sort();

  const res = await supabase
    .from("lessons")
    .select("lesson_date, lesson_time, duration_minutes, status")
    .eq("instructor_id", instructorId)
    .is("deleted_at", null)
    .gte("lesson_date", sorted[0])
    .lte("lesson_date", sorted[sorted.length - 1]);
  if (res.error) {
    console.warn("[bookingConflicts] recurring check failed", res.error);
    return { free: dates, clashing: [] };
  }

  const byDate = new Map<string, Array<{ s: number; e: number }>>();
  for (const l of (res.data ?? []) as Array<{
    lesson_date: string;
    lesson_time: string | null;
    duration_minutes: number | null;
    status: string | null;
  }>) {
    if (!l.lesson_time) continue;
    if (String(l.status || "").toLowerCase() === "cancelled") continue;
    const s = hmToMin(l.lesson_time);
    const list = byDate.get(l.lesson_date) ?? [];
    list.push({ s, e: s + (l.duration_minutes ?? 60) });
    byDate.set(l.lesson_date, list);
  }

  const free: string[] = [];
  const clashing: string[] = [];
  for (const d of dates) {
    const busy = byDate.get(d) ?? [];
    if (busy.some((b) => overlaps(startMins, endMins, b.s, b.e))) clashing.push(d);
    else free.push(d);
  }
  return { free, clashing };
}
