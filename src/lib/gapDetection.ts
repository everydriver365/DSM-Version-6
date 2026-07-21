// Shared gap-detection logic. Ported from src/routes/gaps.tsx (proven correct
// for BST timezone handling, buffer application, and working-hours clamping).
// Do not add bug-compatible fallbacks — this is the canonical implementation.

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function hmToMin(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Local-clock YYYY-MM-DD for an ISO timestamp (respects BST/GMT). */
export function localDateStr(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Local-clock HH:MM for an ISO timestamp (respects BST/GMT). */
export function localTimeStr(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export type ComputeDayGapsParams = {
  dayLessons: Array<{
    lesson_time: string;
    duration_minutes: number | null;
    status?: string | null;
    bufferAfterMinutes?: number | null;
  }>;
  calendarBlocks: Array<{
    start_datetime: string;
    end_datetime: string;
    title?: string | null;
  }>;
  recurringBlocks: Array<{
    day_of_week: string;
    start_time: string;
    end_time: string;
    is_active?: boolean;
  }>;
  dayTimeOff: Array<{
    start_time?: string | null;
    end_time?: string | null;
    all_day?: boolean | null;
  }>;
  dayStart: string;
  dayEnd: string;
  instructorBufferAfter: number;
  dateStr: string;
  isToday: boolean;
  nowMinutes?: number;
  minGapMinutes?: number;
};

export type ComputedGap = {
  startMins: number;
  endMins: number;
  gapMins: number;
};

/**
 * Compute free-time gaps for a single day. Ported verbatim from the per-day
 * loop in src/routes/gaps.tsx (working-hours clamping, per-pupil buffer,
 * calendar/recurring/partial-time-off merging as busy blocks, tail-gap to end
 * of day, and the "at least 30 min from now" rule for today).
 */
export function computeDayGaps(params: ComputeDayGapsParams): ComputedGap[] {
  const {
    dayLessons,
    calendarBlocks,
    recurringBlocks,
    dayTimeOff,
    dayStart,
    dayEnd,
    instructorBufferAfter,
    dateStr,
    isToday,
  } = params;
  const minGap = Math.max(1, params.minGapMinutes ?? 60);
  const wsMin = hmToMin(dayStart || "09:00");
  const weMin = hmToMin(dayEnd || "18:00");

  // Full-day time off → no gaps.
  if ((dayTimeOff || []).some((t) => t.all_day)) return [];

  // Lessons → busy blocks (skip cancelled). Buffer travels on the block via bufAfter.
  const busy: { start: number; end: number; bufAfter: number }[] = [];
  for (const l of dayLessons || []) {
    if (String(l.status || "").toLowerCase() === "cancelled") continue;
    if (!l.lesson_time) continue;
    const s = hmToMin(l.lesson_time);
    const e = s + (l.duration_minutes ?? 60);
    const bufAfter =
      l.bufferAfterMinutes != null
        ? Number(l.bufferAfterMinutes)
        : instructorBufferAfter;
    busy.push({ start: s, end: e, bufAfter });
  }

  // External calendar blocks — filter by local date, clamp multi-day spans.
  for (const b of calendarBlocks || []) {
    const startDate = localDateStr(b.start_datetime);
    const endDate = localDateStr(b.end_datetime);
    const overlaps =
      startDate === dateStr ||
      (startDate < dateStr && endDate > dateStr) ||
      (startDate < dateStr && endDate === dateStr);
    if (!overlaps) continue;
    const startTime = localTimeStr(b.start_datetime) || "00:00";
    const endTime = localTimeStr(b.end_datetime) || "23:59";
    const startMs = new Date(b.start_datetime).getTime();
    const endMs = new Date(b.end_datetime).getTime();
    const durationMins = Number.isFinite(startMs) && Number.isFinite(endMs)
      ? Math.max(0, Math.round((endMs - startMs) / 60000))
      : 0;
    const startsAtBoundary = startTime === "00:00" || startTime === "01:00";
    const endsAtBoundary = endTime === "00:00" || endTime === "01:00" || endTime === "23:59";
    const isAllDay =
      (startTime === "00:00" && (endTime === "00:00" || endTime === "23:59")) ||
      (durationMins >= 20 * 60 && startsAtBoundary && endsAtBoundary);
    if (isAllDay) continue;
    const spansIntoDay = startDate < dateStr;
    const spansOutOfDay = endDate > dateStr;
    busy.push({
      start: isAllDay || spansIntoDay ? 0 : hmToMin(startTime),
      end: isAllDay || spansOutOfDay ? 1439 : hmToMin(endTime),
      bufAfter: instructorBufferAfter,
    });
  }

  // Recurring blocks for this weekday.
  const dayName = DAY_NAMES[new Date(dateStr + "T12:00:00").getDay()];
  for (const b of recurringBlocks || []) {
    if (b.day_of_week !== dayName) continue;
    if (b.is_active === false) continue;
    busy.push({
      start: hmToMin(b.start_time),
      end: hmToMin(b.end_time),
      bufAfter: instructorBufferAfter,
    });
  }

  // Partial time off (not all-day).
  for (const t of dayTimeOff || []) {
    if (t.all_day) continue;
    if (!t.start_time || !t.end_time) continue;
    busy.push({
      start: hmToMin(t.start_time),
      end: hmToMin(t.end_time),
      bufAfter: instructorBufferAfter,
    });
  }

  busy.sort((a, b) => a.start - b.start);

  // Walk blocks in order. Between A → B, the only reservation is A.bufAfter.
  const gaps: ComputedGap[] = [];
  let rawCursor = wsMin;
  let prev: (typeof busy)[0] | null = null;
  let hasPrev = false;
  for (const l of busy) {
    const leftReserve = hasPrev && prev ? prev.bufAfter : 0;
    const effStart = rawCursor + leftReserve;
    const effEnd = hasPrev ? l.start : l.start - l.bufAfter;
    const clampedStart = Math.max(effStart, wsMin);
    const clampedEnd = Math.min(effEnd, weMin);
    if (clampedEnd - clampedStart >= minGap) {
      gaps.push({
        startMins: clampedStart,
        endMins: clampedEnd,
        gapMins: clampedEnd - clampedStart,
      });
    }
    rawCursor = Math.max(rawCursor, l.end);
    prev = l;
    hasPrev = true;
  }
  // Tail gap to end of workday.
  const tailLeftReserve = hasPrev && prev ? prev.bufAfter : 0;
  const clampedTailStart = Math.max(rawCursor + tailLeftReserve, wsMin);
  const clampedTailEnd = weMin;
  if (clampedTailEnd - clampedTailStart >= minGap) {
    gaps.push({
      startMins: clampedTailStart,
      endMins: clampedTailEnd,
      gapMins: clampedTailEnd - clampedTailStart,
    });
  }

  // Today-only: don't offer slots starting within the next 30 min; round up to 15.
  if (isToday) {
    const nowMins =
      params.nowMinutes ??
      new Date().getHours() * 60 + new Date().getMinutes();
    const minStartMins = nowMins + 30;
    const adjusted: ComputedGap[] = [];
    for (const g of gaps) {
      let gStart = g.startMins;
      if (gStart < minStartMins) gStart = Math.ceil(minStartMins / 15) * 15;
      if (gStart >= g.endMins) continue;
      const gapMins = g.endMins - gStart;
      if (gapMins < minGap) continue;
      adjusted.push({ startMins: gStart, endMins: g.endMins, gapMins });
    }
    return adjusted;
  }
  return gaps;
}
