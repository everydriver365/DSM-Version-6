# Ignore all-day calendar events when finding free slots

All-day entries (e.g. "Lotty no college") are notes, not real busy time. They should still show on the diary exactly as they do now, but they must never hide a free slot.

## Current state

- The free-time engine already skips entries marked all-day (`src/lib/gapDetection.ts:136`).
- Gap Filler (`src/routes/gaps.tsx`) and Schedule (`src/routes/schedule.tsx`) already read the all-day flag and pass it through, so those two screens behave correctly.
- The Home screen still reads calendar entries without the all-day flag (`src/routes/home.tsx:4330`) and feeds them into the free-time engine at three places (today, tomorrow, and the day list). There, an all-day note is treated as a real block and hides gaps.

## Changes

1. `src/routes/home.tsx` — include the all-day and blocks-availability fields in the calendar query used for gap finding.
2. `src/routes/home.tsx` — pass the all-day flag through in each of the places that hand calendar entries to the free-time engine (around lines 4471, 4491, 4530, 6756), so the engine can ignore them.
3. `src/lib/gapDetection.ts` — small safeguard: also treat an entry that covers a whole day from midnight to midnight as an all-day note, in case the flag is missing on some imported entries.

Nothing changes in how events are displayed, in Google sync, lessons, recurring blocks, time off, text messaging, pupil matching, the database, or `capacitor.config.ts`.

## Verification

- Run the full test suite and the type check.
- Confirm 9 and 21 September show the expected free slots on Home, Schedule and Gap Filler.
