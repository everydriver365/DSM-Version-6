## Goal

In `src/routes/gaps.tsx`, only surface pupils for a gap when the entire lesson fits inside **both** the instructor's working hours **and** the pupil's `available_from`–`available_until` window. Stop suggesting times outside those windows (e.g. late-evening / overnight slots).

## Current behavior (verified in `src/routes/gaps.tsx`)

- `previewMatchForGap` (line 1012) checks day-of-week, duration, and min-notice — it never reads `available_from` / `available_until`, so a pupil available 09:00–17:00 still appears on a 20:00 gap.
- `scoreSlot` (line 359) reads the window but only at whole-hour granularity via `parseInt(...split(":")[0])`, and out-of-window slots only lose points — they are still returned in `matchedSlots` and can be offered.
- Gap detection itself already clamps to `wsMin`/`weMin` (instructor working hours), so overnight gaps come from the pupil side, not the instructor side.

## Changes (only `src/routes/gaps.tsx`)

1. **Add a shared helper** `slotFitsPupilWindow(startMin, durationMin, availability)`:
   - Parse `available_from` / `available_until` as `HH:MM` → minutes (use existing `hmToMin`).
   - Default window `08:00`–`18:00` when unset (matches current defaults).
   - Return `true` only if `startMin >= fromMin` **and** `startMin + durationMin <= untilMin`.
   - This closes the "overnight" case: a lesson that starts before `until` but runs past it is rejected.

2. **`previewMatchForGap`**: after the day/duration/notice checks, also require `slotFitsPupilWindow(gap.startMin, gap.durationMin, s)`. Pupils outside the window are excluded from the count and avatar preview.

3. **`scoreSlot` / matched-slot filtering**: use `slotFitsPupilWindow` on the actual `sl.time` + `sl.duration` (minute-accurate, not hour-rounded). When the slot falls outside the pupil's window, mark `match: false` so it's excluded from offers (the existing "This slot is outside your working hours — showing all available slots instead" fallback at line 1618 still handles the empty-matches case for instructor working hours; pupil-window misses simply produce no match for that pupil, consistent with today's behavior for day-of-week mismatches).

4. No changes to gap detection, DB queries, UI layout, or the message/recipients flow.

## Out of scope

- Instructor working-hours logic (already enforced during gap detection).
- Schedule/home timeline gap previews — user asked specifically about the gap filler screen.