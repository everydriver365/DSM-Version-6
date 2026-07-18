## Problem

The timeline gap card shows `19:48 – 18:50` with `23h 2m free · £921 potential`. The end time is earlier than the start because the gap spans overnight between two lessons on different dates (visible on the "Next" tab, where `nextTabLessons` contains lessons across multiple future days). The between-lesson gap loop in `src/routes/home.tsx` around lines 5089–5100 computes `nextStart - endThis` with no same-day check and no working-hours clamp, so a lesson ending 19:48 on day N followed by one starting 18:50 on day N+1 becomes a single 23h "free" slot.

## Fix (src/routes/home.tsx only)

In the between-lesson gap loop (~5089–5100):

1. Skip the gap entirely when `l.lesson_date !== next.lesson_date` (no cross-day "free" slots).
2. For same-day pairs, clamp `gapStart` and `nextStart` to that day's working-hours window (`workingHours.start_time` / `end_time`, defaults `09:00` / `18:00`) before computing `mins`. Only push when the clamped `mins >= 60`.

Apply the same working-hours clamp to the today-only before-first and after-last tail gaps (5102–5122) for consistency — currently fine but worth guarding after the refactor.

No other files, no logic changes elsewhere, no styling changes.

## Verification

Reload `/home`, switch to the "Next" tab: the `19:48 – 18:50 · 23h 2m free` card should disappear. Today/tomorrow tabs should render the same gap counts and durations as before.
