// Hides Google Calendar events that are really DSM lessons echoed back in
// through the external calendar import, so a lesson isn't shown twice.

type BlockLike = {
  start_datetime: string;
  end_datetime: string;
  source?: string;
  [key: string]: unknown;
};

type LessonLike = {
  lesson_date: string;
  lesson_time: string;
  duration_minutes?: number | null;
  [key: string]: unknown;
};

const FIVE_MIN_MS = 5 * 60 * 1000;

/**
 * Drops `external_calendar` blocks whose start time is within 5 minutes of a
 * DSM lesson's start time. Blocks from any other source are kept unchanged.
 */
export function filterEchoedBlocks<T extends BlockLike>(
  blocks: T[],
  lessons: LessonLike[],
): T[] {
  if (!Array.isArray(blocks) || blocks.length === 0) return blocks ?? [];

  const lessonStarts: number[] = [];
  for (const l of lessons || []) {
    if (!l?.lesson_date || !l?.lesson_time) continue;
    const time = String(l.lesson_time).slice(0, 8);
    const ms = new Date(`${l.lesson_date}T${time}`).getTime();
    if (!Number.isNaN(ms)) lessonStarts.push(ms);
  }
  if (lessonStarts.length === 0) return blocks;

  return blocks.filter((b) => {
    if ((b.source ?? "external_calendar") !== "external_calendar") return true;
    const startMs = new Date(b.start_datetime).getTime();
    if (Number.isNaN(startMs)) return true;
    const echoed = lessonStarts.some(
      (ls) => Math.abs(startMs - ls) <= FIVE_MIN_MS,
    );
    return !echoed;
  });
}
