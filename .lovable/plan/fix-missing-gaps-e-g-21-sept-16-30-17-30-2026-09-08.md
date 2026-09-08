# Fix missing gaps (e.g. 21 Sept 16:30–17:30)

## What I found in the code

Two confirmed problems in how free time is worked out. I have not yet confirmed
which one causes the exact 21 Sept case, so step 1 verifies that first.

1. **Travel time is counted twice between two commitments.**
   In `src/lib/gapDetection.ts` each lesson/event is stored with travel time
   already added to its end, and then the gap walk subtracts travel time again
   before the next commitment. With a 15-minute buffer, a lesson ending 16:30 and
   the next starting 17:30 leaves only 30 usable minutes, so a genuine one-hour
   hole is discarded by the 60-minute minimum and never offered. This matches the
   reported symptom exactly.

2. **The diary passes busy events into the gap check and then ignores them.**
   `detectGaps()` in `src/routes/schedule.tsx` receives `busyBlocksForGaps`
   (Google events for the dates on screen, plus private EveryDriver events) but
   internally uses the separate `icsBlocks` list instead, which is only loaded for
   today through today + 14 days and excludes private events. So for dates beyond
   that window there is no calendar data at all, and private events never block
   time.

Also worth knowing: the Gap Filler screen only ever covers today through today + 6
days, so 21 Sept will not appear there yet — only the diary shows it.

## Plan

1. **Verify the 21 Sept case first.** Read that day's lessons, Google events,
   recurring blocks, time off and the working hours/buffer for that weekday, and
   confirm which rule removes the 16:30–17:30 slot. Report the finding before
   changing behaviour.

2. **Fix the double travel-time deduction** in `src/lib/gapDetection.ts`: reserve
   travel time once between two commitments, not once on each side. Smallest
   possible change; the existing tests for buffers before/after lessons, imported
   Google events, recurring blocks and time off must all still pass, updating only
   the expectations that were themselves encoding the double deduction (each one
   listed explicitly before it is changed).

3. **Make the diary use the busy list it already builds**: have `detectGaps()` use
   its `calendarBlocks` argument instead of `icsBlocks`, so Google events for the
   visible dates and private EveryDriver events both block time, at any date on
   screen.

4. **Verify**: full test suite, type-check, and a re-check that 21 Sept 16:30–17:30
   now appears while genuinely busy times (a Google event plus its travel time)
   are still not offered.

## Out of scope

No changes to Google sync or the diary display, SMS, pupil matching, the 7-day Gap
Filler window, the database schema, or `capacitor.config.ts`.
