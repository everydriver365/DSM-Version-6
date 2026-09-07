# Google Calendar events should block free slots

## Why the 10th showed 14:30–16:00

The free-slot finder currently only looks at events from your imported calendar feed. Events that come from the Google Calendar connection are stored separately and are shown on screen but skipped when working out free time — so the 15:00 Google event on the 10th was invisible to the slot finder.

## What will change

Google Calendar events will count as busy time everywhere free slots are worked out:

- Gap Filler page
- Home screen gap suggestions
- Schedule page gap suggestions

They will be treated exactly like imported calendar events:

- your travel buffer is added before and after each event
- all-day events block the whole day
- events marked as not blocking availability are still ignored
- events are trimmed to your working hours

With this, the 10th would offer 14:30 only if it ends early enough before the 15:00 event including travel time — in practice that slot disappears.

## Technical notes

- `src/routes/gaps.tsx`: widen the `calendar_blocks` query so it is not restricted to `source = 'ics_inbound'` (keep the instructor and date-range filters), and feed all returned blocks into `computeDayGaps`.
- `src/routes/home.tsx` and `src/routes/schedule.tsx`: pass the combined imported + Google blocks into gap detection instead of the current `calendarBlocks: []` / ICS-only mapping, leaving the visual rendering of calendar events untouched.
- `src/lib/gapDetection.ts` needs no logic change; add a regression test in `src/lib/gapDetection.test.ts` covering a Google-sourced 15:00 event blocking a 14:30 start.
- Verify with `bun test src/lib/gapDetection.test.ts` and `bunx tsgo --noEmit`.
- `capacitor.config.ts` is not touched.
