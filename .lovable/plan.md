## Answer

Yes — the Home "Teaching today" timeline already uses the shared `computeDayGaps` from `src/lib/gapDetection.ts` (home.tsx line 5745), so the same all-day-event fix applies. Any gaps that would previously be swallowed by a multi-day/all-day Google Calendar event (e.g. "Summer holiday") will now appear as `FILL THIS GAP` rows on today's timeline too.

One small cosmetic follow-up is optional:

## Optional cleanup

In `src/routes/home.tsx`, `blocksForDate` (line 3722) does not filter out all-day events, so an all-day holiday still renders as a full "calendar" row inside today's timeline. It no longer blocks gaps, but it looks noisy.

Proposed change (home.tsx only):
- Extend `blocksForDate` to compute the same `isAllDay` check used in `gapDetection.ts` (start/end at 00:00/01:00/23:59 boundary OR duration ≥ 20h) and drop those blocks before returning.
- Result: all-day events are hidden from the today/tomorrow timeline rows on Home, matching the gap-detector's behaviour and matching what `gaps.tsx` already does.

Want me to apply this cleanup, or leave the all-day event visible on the timeline?