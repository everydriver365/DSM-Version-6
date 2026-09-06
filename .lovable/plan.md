# Gap Finder — rebuilt from scratch

Today the "free gap" logic is written three times over: on the home Teaching Schedule tile, on the Schedule page, and again on the Gaps page. Each one loads its own data, resolves working hours its own way, and decides differently whether a day counts as a working day. That is why gaps appear on some screens and not others, and why calendar events sometimes get ignored.

The fix is one gap engine, one data loader, and one gap card used everywhere.

## What you'll get

- Free gaps shown for **every day** in the next 14 days, on the home tile, the Schedule page (Day / Week / All / Free) and the Gaps page — all from the same calculation, so they always agree.
- Google Calendar events, personal events, recurring blocks and time off are always subtracted. Days off and full-day time off show no gaps at all.
- Your working hours (including per-day hours), lesson buffers and minimum gap length are always respected.
- Each gap card shows the day ("Today", "Tomorrow" or the date), the time range, how long it is, likely earnings, and up to 3 pupils who could actually take that slot based on their availability and usual lesson length — tap to fill it.
- Gaps that have already started, or start within the next 30 minutes, still show as "Free time" but without the booking prompt.

## Defaults being set

- Minimum gap length: your saved preference, with the current hidden 60-minute floor removed so shorter gaps (e.g. 45 min) can surface if you choose.
- Non-working days: no gaps shown.
- Range: 14 days ahead.

## Technical detail

**New: `src/lib/gapEngine.ts`** — pure, testable core.
- `resolveDayHours(date, prefs)` — single rule: use `per_day_hours[day]` when present and `active !== false`; otherwise fall back to `working_days`; day is off only when explicitly inactive or absent from `working_days`.
- `computeDayGaps(...)` — reuse the existing proven body from `src/lib/gapDetection.ts` (busy-block merge, buffer handling, multi-day/all-day calendar clamping, tail gap, `isSoonOrPast` flag), moved here unchanged apart from taking `resolveDayHours` output.
- `computeRangeGaps(startDate, days, data)` → `Array<{ date, dayName, gaps: ComputedGap[] }>` for the whole window.

**New: `src/hooks/useGapFinder.ts`** — one loader for the window:
`instructors` prefs, `lessons` (date range), `calendar_blocks` + `personal_calendar_events` (overlap filters `end >= start` / `start <= end`), `instructor_recurring_blocks` (active), `instructor_time_off` (overlapping), pupils + availability rows. Returns `{ gapsByDate, gapsForDate(date), loading, refresh }` plus attached pupil matches via `getMatchingPupils`.

**`src/lib/gapMatching.ts`** — keep, extend the returned match with `fitsDuration` and pass `preferred_lesson_length`, so a gap shorter than the pupil's usual lesson is excluded rather than scored.

**New shared component `src/components/schedule/GapCard.tsx`** — the amber dashed card (day label, time range, duration, earnings, pupil avatars, count, Fill this gap / Free time), used by home, schedule and gaps.

**Rewires (no visual change beyond the shared card):**
- `src/routes/home.tsx` — delete the local `resolveDayHours`, the per-tab gap loops (Today / Tomorrow / Next) and the local calendar/recurring/time-off fetches; render `useGapFinder` output.
- `src/routes/schedule.tsx` — delete local gap generation and the `active === true` day check; Day/Week/All/Free all read from the hook.
- `src/routes/gaps.tsx` — swap its private gap computation for the hook, keeping its richer per-pupil UI and SMS/booking flows intact.

**`src/lib/gapPrefs.ts`** — drop the `Math.max(value, 60)` floor in `readMinGapMinutes`/`writeMinGapMinutes`; default stays 60.

`src/lib/gapDetection.ts` becomes a thin re-export so nothing breaks mid-migration, then is removed once all three routes are switched. `capacitor.config.ts` is not touched.
