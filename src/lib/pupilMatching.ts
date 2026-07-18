// Shared pupil-matching logic used by both gaps.tsx and schedule.tsx.
// Ported verbatim from the correct implementation in gaps.tsx so both
// pages enforce identical rules (day, duration, time window, notice).

export interface PupilPreview {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name?: string | null;
  calendar_colour: string | null;
}

export interface Availability {
  pupil_id: string;
  available_days: string[] | null;
  available_from: string | null;
  available_until: string | null;
  min_notice_hours: number | null;
  short_notice_opt_in: boolean | null;
  preferred_duration_minutes: number | null;
}

function hmToMin(t: string): number {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

function minToHm(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function slotFitsPupilWindow(
  startMin: number,
  durationMin: number,
  s: Availability | null,
): boolean {
  const fromMin = hmToMin(s?.available_from || "08:00");
  const untilMin = hmToMin(s?.available_until || "18:00");
  return startMin >= fromMin && startMin + durationMin <= untilMin;
}

export function previewMatchForGap<P extends PupilPreview>(params: {
  date: string;
  dayName: string;
  startMin: number;
  durationMin: number;
  allPupils: P[];
  allAvailability: Availability[];
}): { count: number; topPupils: P[]; allMatched: P[] } {
  const { date, dayName, startMin, durationMin, allPupils, allAvailability } = params;
  if (!allPupils.length || !allAvailability.length) {
    return { count: 0, topPupils: [], allMatched: [] };
  }
  const availByPupil = new Map<string, Availability>();
  for (const a of allAvailability) {
    if (a.pupil_id) availByPupil.set(a.pupil_id, a);
  }
  const slotStart = new Date(`${date}T${minToHm(startMin)}:00`).getTime();
  const hoursUntilSlot = (slotStart - Date.now()) / 3600000;

  const matched: P[] = [];
  for (const p of allPupils) {
    const s = availByPupil.get(p.id);
    if (!s) continue;
    const availDays = s.available_days || [];
    if (!availDays.includes(dayName)) continue;
    const minDuration = s.preferred_duration_minutes ?? 60;
    if (durationMin < minDuration) continue;
    if (!slotFitsPupilWindow(startMin, durationMin, s)) continue;
    const minNoticeHours = s.min_notice_hours ?? 24;
    if (hoursUntilSlot < minNoticeHours && !s.short_notice_opt_in) continue;
    matched.push(p);
  }
  return { count: matched.length, topPupils: matched.slice(0, 3), allMatched: matched };
}
