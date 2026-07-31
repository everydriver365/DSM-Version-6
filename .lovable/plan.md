# Hide Google copies of DSM lessons in the schedule

## What's happening now

Both screens fetch only imported Google events and render them next to lessons:

- `src/routes/home.tsx` (~line 3007-3045): `calendarBlocks` state, filled from
  `calendar_blocks` where `source = external_calendar` for today + tomorrow.
  Used for the timeline rows (~3089), gap detection (~3146-3230) and the
  gaps sheet (~5078).
- `src/routes/schedule.tsx` (~line 469): same rows fetched over REST into a
  `calendarBlocks` state, used for day rows (~726, 876-908, 1193, 1229).

Neither place checks whether an imported event is really a DSM lesson pushed
out to Google and read back in, so the lesson shows twice.

## The fix

**New file `src/lib/calendarDedupe.ts`** exporting `filterEchoedBlocks(blocks, lessons)`:

- Blocks whose `source` is not `external_calendar` are kept untouched.
- An `external_calendar` block is dropped when any lesson's start
  (`new Date(\`${lesson.lesson_date}T${lesson.lesson_time}\`)`) is within
  5 minutes of the block's `start_datetime`.
- Otherwise the block is kept — it is a genuine external event.

**`src/routes/home.tsx`** — import the helper and add a memo that runs the
fetched blocks through it against today's + tomorrow's lessons, then use that
filtered list everywhere `calendarBlocks` is currently read (timeline rows,
gap detection for both days, the gaps sheet).

**`src/routes/schedule.tsx`** — same: one memo over the fetched blocks and the
loaded `lessons`, used for the day rows and gap detection.

## Technical notes

- Both queries already filter to `source = external_calendar` but don't select
  the column, so the rows are tagged with `source: 'external_calendar'` before
  being passed to the helper.
- Filtering happens once, at the derived-state level, so rendering and gap
  detection stay in sync — no phantom "busy" time from echoed lessons.
- No other files, no database or edge function changes.
