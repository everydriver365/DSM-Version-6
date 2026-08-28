# Why Luke Shaw isn't in the Upcoming tests tile

## What the code does today

The dashboard "Upcoming tests" tile does not read test lessons at all. It queries the
`pupils` table for rows with `test_date` set and in the future (`src/routes/home.tsx`,
around lines 2216-2235). Test lessons live in the `lessons` table with
`lesson_type = "test"`.

The two are kept in step by `syncPupilTestFields` (`src/lib/pupilTestSync.ts`), which is
called only when a lesson is saved through Add Lesson or Edit Lesson. Any test created
before that sync existed — or created by another path — leaves the pupil row's
`test_date` empty, so the pupil never appears in the tile. A backfill script for exactly
this case exists at `db/062_backfill_pupil_test_fields.sql` and, based on the earlier
conversation, has not been run.

Most likely cause (unconfirmed until we check the data): Luke Shaw's pupil row has no
`test_date`, even though a test lesson exists for him.

## Plan

1. Verify first: check Luke Shaw's `pupils` row (`test_date`, `test_time`, `test_centre`,
   `test_status`, `instructor_id`) against his `lessons` row with `lesson_type = 'test'`.
   This confirms whether it is a missing sync, a wrong instructor id, a past date, or a
   `test_status` issue. No code changes until this read is done.

2. If it is the missing sync (expected):
   - Run the existing backfill `db/062_backfill_pupil_test_fields.sql` in Supabase so all
     historic test lessons populate the matching pupil fields.
   - Make the tile self-healing rather than sync-dependent: in `src/routes/home.tsx`, also
     query future `lessons` with `lesson_type = 'test'` and merge them into
     `upcomingTests`, keyed by pupil, preferring the lesson's date/time/centre when the
     pupil row is blank. That way a test shows on the dashboard the moment the lesson
     exists, regardless of whether the pupil row was synced.

3. If the verification shows a different cause (e.g. date already passed, or the test is
   attached to a different instructor), fix that specific cause instead and report back
   before changing the tile.

## Technical notes

- Files touched: `src/routes/home.tsx` only (tile data loading), plus running the existing
  SQL file. No changes to `capacitor.config.ts` or unrelated files.
- Merge is done client-side in the same effect that currently sets `upcomingTests`, so the
  bottom sheet, alert strip, countdown, and "Details needed" pills all benefit without
  further changes.
