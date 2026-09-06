/**
 * Shared pupil-to-gap matching.
 *
 * Extracted from the scoring logic used on the /gaps page (scoreSlot /
 * slotFitsPupilWindow) so that the home teaching schedule gap card can show
 * which pupils could fill a free slot without opening /gaps.
 */

export type MatchablePupil = {
  id: string;
  first_name?: string | null;
  name?: string | null;
  preferred_lesson_length?: number | null;
  availability_days?: string[] | null;
};

export type GapForMatching = {
  date: string;
  dayName: string;
  startMins: number;
  durationMins: number;
};

export type PupilMatch<P extends MatchablePupil = MatchablePupil> = {
  pupil: P;
  score: number;
  reason: string;
};

export function getMatchingPupils<P extends MatchablePupil>(
  gap: GapForMatching,
  pupils: P[],
): Array<PupilMatch<P>> {
  if (!gap || !pupils?.length) return [];

  const dayName = String(gap.dayName || "").toLowerCase();
  const results: Array<PupilMatch<P>> = [];

  for (const p of pupils) {
    let score = 50;
    const reasons: string[] = [];

    const days = (p.availability_days || []).map((d) => String(d).toLowerCase());
    if (days.length) {
      if (dayName && days.includes(dayName)) {
        score += 25;
        reasons.push("Available this day");
      } else {
        // Not available on this weekday — not a match.
        continue;
      }
    }

    const preferred = p.preferred_lesson_length ?? null;
    if (preferred != null) {
      if (gap.durationMins >= preferred) {
        score += preferred === gap.durationMins ? 20 : 10;
        reasons.push(`${preferred}min lesson fits`);
      } else {
        // Gap is too short for this pupil's usual lesson.
        continue;
      }
    } else if (gap.durationMins >= 60) {
      score += 5;
      reasons.push("Slot long enough");
    }

    score = Math.max(0, Math.min(100, score));
    results.push({
      pupil: p,
      score,
      reason: reasons.length ? reasons.join(" · ") : "Possible match",
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 3);
}

export function pupilInitials(p: MatchablePupil): string {
  const full = (p.name || p.first_name || "").trim();
  if (!full) return "?";
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
