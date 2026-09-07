/**
 * Europe/London wall-clock helpers.
 *
 * EveryDriver stores lesson times as naive local wall-clock values
 * (`lesson_date` = YYYY-MM-DD, `lesson_time` = HH:mm[:ss]). Those are always
 * UK local time. Anything that leaves the app (Google Calendar, ICS) must send
 * the wall-clock value together with an explicit `Europe/London` timezone,
 * never a `Z` instant produced by `new Date(...).toISOString()` — that reads
 * the naive string as UTC and shifts every summer (BST) time by one hour.
 */

const LONDON = "Europe/London";

/** Offset of Europe/London from UTC, in ms, at the given UTC instant. */
export function londonOffsetMs(utcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) parts[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(parts["year"]),
    Number(parts["month"]) - 1,
    Number(parts["day"]),
    Number(parts["hour"]) % 24,
    Number(parts["minute"]),
    Number(parts["second"]),
  );
  return asUtc - utcMs;
}

/** Parse "YYYY-MM-DD" + "HH:mm[:ss]" as London wall-clock time. */
export function parseLondonWall(date: string, time: string): {
  y: number; mo: number; d: number; h: number; mi: number; s: number;
} {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi, s] = time.split(":").map(Number);
  return { y, mo, d, h, mi, s: Number.isFinite(s) ? s : 0 };
}

/** London wall-clock time -> the real UTC instant, DST-aware. */
export function londonWallToUtcMs(date: string, time: string): number {
  const { y, mo, d, h, mi, s } = parseLondonWall(date, time);
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  // Two passes settle the ambiguity around DST transitions.
  let ms = guess - londonOffsetMs(guess);
  ms = guess - londonOffsetMs(ms);
  return ms;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** UTC instant -> "YYYY-MM-DDTHH:mm:ss" London wall-clock (no offset suffix). */
export function utcMsToLondonWall(utcMs: number): string {
  const d = new Date(utcMs + londonOffsetMs(utcMs));
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

/**
 * Start/end wall-clock strings for a lesson, safe to send to Google as
 * `{ dateTime, timeZone: "Europe/London" }`.
 */
export function lessonWallRange(
  lessonDate: string,
  lessonTime: string,
  durationMinutes: number,
): { start: string; end: string; timeZone: string } {
  const { y, mo, d, h, mi, s } = parseLondonWall(lessonDate, lessonTime);
  const start = `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}`;
  const endMs = londonWallToUtcMs(lessonDate, lessonTime) + durationMinutes * 60000;
  return { start, end: utcMsToLondonWall(endMs), timeZone: LONDON };
}

/**
 * An all-day Google event gives `start.date` and an *exclusive* `end.date`.
 * Store both as London midnight instants so availability maths is correct.
 */
export function allDayRangeToIso(startDate: string, endDate: string): {
  startIso: string; endIso: string;
} {
  return {
    startIso: new Date(londonWallToUtcMs(startDate, "00:00:00")).toISOString(),
    endIso: new Date(londonWallToUtcMs(endDate, "00:00:00")).toISOString(),
  };
}
