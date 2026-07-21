## What's happening

On `/schedule`, the agenda row list is built from `orderedDayKeys = [...entriesByDay.keys()]`, then only today is force-included via `orderedDayKeysWithToday`. `entriesByDay` is keyed by dates that have a lesson or a Google Calendar block. Any day that has neither is **not in the rows array at all** — so the per-row gap detection never runs for it, and no "FILL THIS GAP" tile appears.

That's why today shows a gap tile (force-added) and other days may or may not (only if they happen to have an event). If a day's Google event is all-day, the day is in `entriesByDay` but `computeDayGaps` sees a 00:00–23:59 busy block and returns no gaps — worth flagging separately.

## Fix — only touch `src/routes/schedule.tsx`

1. Add a memo `workingDayKeysInRange` that walks from `rangeStart` to `rangeEnd` (already fetched) and yields `ymdLocal(date)` for each day whose weekday name is active in `perDayHours` (or in `workingDaysList` when `perDayHours` is null). Skip past days (`key < todayKey`) so the agenda still starts at today.
2. Replace the current `orderedDayKeysWithToday` merge with a union of `orderedDayKeys ∪ workingDayKeysInRange ∪ [todayKey]`, deduped and sorted. Feed this into the existing `rows` memo — no changes to the row renderer, gap detection, or `/gaps`.
3. Leave the empty-state branch (`row.entries.length === 0 && isToday`) as-is; on other empty working days the else branch already runs `detectGaps` and renders gap rows.

## Optional secondary tweak (call out, don't fix unless asked)

If a day is fully covered by an all-day Google Calendar block, `computeDayGaps` returns zero gaps by design. That's separate from the row-omission bug and can be addressed later if you want all-day events treated as "informational" rather than blocking.

## Verification

- Days with no lessons and no Google events but active working hours now render a day row with the gap tile.
- Days with lessons/events keep their current behavior (lessons + interleaved gaps).
- Non-working days (day off in `perDayHours`) don't add empty rows.
- `/gaps` and gap-detection logic are untouched.
