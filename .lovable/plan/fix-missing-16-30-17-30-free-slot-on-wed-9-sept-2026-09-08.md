# Fix: missing 16:30–17:30 free slot on Wed 9 Sept

## What I found (verified against your live diary)

Your 9 Sept has three Google events (09:00–12:00, 13:00–16:00, 18:00–21:00), working
hours 10:30–21:00 and 30 minutes travel time, so 16:30–17:30 should be offered.
Running the free-time engine with exactly that data does return 16:30–17:30.

There is also an all-day Google entry on 9 Sept called "Lotty no college".
All-day entries are meant to be treated as notes, not busy time — and they are,
as long as the diary knows the entry is all-day.

The Schedule screen loads its Google entries without the "all day" marker
(the field is simply not requested in the two places Schedule fetches them).
Without that marker, "Lotty no college" looks like a timed entry running from
midnight to 23:00, which swallows the whole of 9 Sept and removes every free
slot for that day. The Gap Filler screen does request the marker, which is why
the two screens disagree.

## The change

In `src/routes/schedule.tsx`, add `is_all_day` (and `blocks_availability`) to the
two `calendar_blocks` selects — the initial load and the post-sync reload.
Nothing else changes: the free-time engine, Google sync, display, lessons,
recurring blocks, time off, SMS and pupil matching all stay exactly as they are.

## Verification

- Re-run the free-time calculation for 9 Sept with the real data and confirm 16:30–17:30 appears.
- Confirm days with genuinely blocking timed events are unchanged (8 Sept keeps 14:30–17:30).
- Full test suite (`bun test`) and typecheck.
- `capacitor.config.ts` untouched.
