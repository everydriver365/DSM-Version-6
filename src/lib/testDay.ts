// Test day timing rules: the booking starts 1 hour before the test appointment
// and ends 90 minutes after it (2h30 total).
export const TEST_PRE_MINUTES = 60;
export const TEST_POST_MINUTES = 90;
export const TEST_TOTAL_MINUTES = TEST_PRE_MINUTES + TEST_POST_MINUTES; // 150

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function toHHMM(mins: number): string {
  const wrapped = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Lesson start time (HH:MM) for a given test appointment time. */
export function testStartTime(testTime: string): string | null {
  const mins = toMinutes(testTime);
  if (mins == null) return null;
  return toHHMM(mins - TEST_PRE_MINUTES);
}

/** Test appointment time derived from a stored lesson start time. */
export function testTimeFromStart(startTime: string): string | null {
  const mins = toMinutes(startTime);
  if (mins == null) return null;
  return toHHMM(mins + TEST_PRE_MINUTES);
}

/** Read "Test at HH:MM" out of a notes field. */
export function testTimeFromNotes(notes?: string | null): string | null {
  const m = /Test at (\d{1,2}:\d{2})/.exec(String(notes ?? ""));
  return m?.[1] ?? null;
}

/** Ensure notes carry a single "Test at HH:MM" marker. */
export function withTestTimeNote(notes: string | null, testTime: string): string | null {
  const base = (notes ?? "").replace(/\n*Test at \d{1,2}:\d{2}/g, "").trim();
  if (!testTime) return base || null;
  return base ? `${base}\nTest at ${testTime}` : `Test at ${testTime}`;
}
