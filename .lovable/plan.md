# Fix travel buffers around imported calendar events

## Confirmed issue

The shared free-slot calculator currently treats travel time inconsistently:

- EDP lessons reserve the configured travel buffer both after the lesson and before the next commitment.
- Imported personal-calendar events reserve it only before the event; their end time is not extended by the travel buffer.

On 9 September, the imported 09:00–12:00 and 13:00–16:00 events therefore leave an artificial 12:00–12:30 opening after the first event. With the one-hour minimum it is hidden, but the underlying free-time calculation is still wrong.

## Fix

- Update the shared gap calculation so a blocking imported calendar event reserves the instructor’s travel buffer after it as well as before it.
- Keep working-hours clamping, overlap merging, all-day handling, and the end-of-day boundary intact.
- Add a focused regression test for two imported calendar events one hour apart with a 30-minute buffer, confirming that no free slot remains between them.
- Confirm the existing lesson-buffer tests continue to pass so Home, Schedule, and Gap Filler all use the same corrected rule.

## Technical scope

- `src/lib/gapDetection.ts`
- `src/lib/gapDetection.test.ts`
- No page redesign, data changes, or calendar display changes.
