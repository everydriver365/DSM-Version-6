/**
 * Canonical gap engine.
 *
 * Single source of truth for "when is the instructor free?". Every screen
 * (home teaching schedule tile, schedule page, gaps page) must resolve working
 * hours and compute gaps through this module so they never disagree.
 */

import {
  computeDayGaps,
  localDateStr,
  localTimeStr,
  type ComputeDayGapsParams,
  type ComputedGap,
} from "./gapDetection";

export { computeDayGaps, localDateStr, localTimeStr };
export type { ComputeDayGapsParams, ComputedGap };

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type PerDayHours = Record<
  string,
  { start?: string | null; end?: string | null; active?: boolean | null }
> | null | undefined;

export type WorkingPrefs = {
  /** Default day start, e.g. "09:00". */
  startTime?: string | null;
  /** Default day end, e.g. "18:00". */
  endTime?: string | null;
  /** Day names the instructor works, e.g. ["Monday", ...]. */
  workingDays?: string[] | null;
  /** Optional per-day override map keyed by day name. */
  perDayHours?: PerDayHours;
};

export type DayHours = {
  /** Day start HH:MM. */
  start: string;
  /** Day end HH:MM. */
  end: string;
  /** False when the instructor does not work this day (no gaps at all). */
  active: boolean;
};

export function dayNameFor(date: Date | string): string {
  const d =
    typeof date === "string" ? new Date(`${date.slice(0, 10)}T12:00:00`) : date;
  return DAY_NAMES[d.getDay()];
}

/**
 * The single working-hours rule used everywhere:
 *  - per-day config present → off only when `active === false`
 *  - no per-day config      → on when the day is listed in working_days
 */
export function resolveDayHours(
  date: Date | string,
  prefs: WorkingPrefs | null | undefined,
): DayHours {
  const fallbackStart = (prefs?.startTime && String(prefs.startTime)) || "09:00";
  const fallbackEnd = (prefs?.endTime && String(prefs.endTime)) || "18:00";
  const name = dayNameFor(date);
  const cfg = prefs?.perDayHours?.[name];

  if (!cfg) {
    const workingDays = prefs?.workingDays?.length
      ? prefs.workingDays
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const active = workingDays.some(
      (d) => String(d).toLowerCase() === name.toLowerCase(),
    );
    return {
      start: fallbackStart,
      end: active ? fallbackEnd : fallbackStart,
      active,
    };
  }

  if (cfg.active === false) {
    return { start: fallbackStart, end: fallbackStart, active: false };
  }

  return {
    start: (cfg.start && String(cfg.start)) || fallbackStart,
    end: (cfg.end && String(cfg.end)) || fallbackEnd,
    active: true,
  };
}

/** YYYY-MM-DD for a local Date. */
export function ymdLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Consecutive local date strings starting at `start` (inclusive). */
export function dateRange(start: Date, days: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + i);
    out.push(ymdLocalDate(d));
  }
  return out;
}

export type RangeGapInputs = {
  prefs: WorkingPrefs | null | undefined;
  /** Lessons keyed by local date (YYYY-MM-DD). */
  lessonsByDate: Record<string, ComputeDayGapsParams["dayLessons"]>;
  calendarBlocks: ComputeDayGapsParams["calendarBlocks"];
  recurringBlocks: ComputeDayGapsParams["recurringBlocks"];
  /** Time-off rows spanning dates; filtered per day inside. */
  timeOff: Array<{
    start_date: string;
    end_date: string;
    start_time?: string | null;
    end_time?: string | null;
    all_day?: boolean | null;
  }>;
  instructorBufferAfter: number;
  minGapMinutes: number;
  todayISO?: string;
};

export type DayGaps = {
  date: string;
  dayName: string;
  gaps: ComputedGap[];
};

/** Compute gaps for every day in the window — including days with no lessons. */
export function computeRangeGaps(
  dates: string[],
  input: RangeGapInputs,
): DayGaps[] {
  const todayISO = input.todayISO ?? ymdLocalDate(new Date());
  return dates.map((dateStr) => {
    const hours = resolveDayHours(dateStr, input.prefs);
    if (!hours.active) return { date: dateStr, dayName: dayNameFor(dateStr), gaps: [] };
    const dayTimeOff = (input.timeOff || [])
      .filter((t) => t.start_date <= dateStr && t.end_date >= dateStr)
      .map((t) => ({
        start_time: t.start_time ?? null,
        end_time: t.end_time ?? null,
        all_day: t.all_day ?? null,
      }));
    const gaps = computeDayGaps({
      dayLessons: input.lessonsByDate[dateStr] ?? [],
      calendarBlocks: input.calendarBlocks || [],
      recurringBlocks: input.recurringBlocks || [],
      dayTimeOff,
      dayStart: hours.start,
      dayEnd: hours.end,
      instructorBufferAfter: input.instructorBufferAfter,
      dateStr,
      isToday: dateStr === todayISO,
      minGapMinutes: input.minGapMinutes,
    });
    return { date: dateStr, dayName: dayNameFor(dateStr), gaps };
  });
}
