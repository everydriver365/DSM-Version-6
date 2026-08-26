# Fix duplicate notifications

## What the data shows

I pulled the last 79 rows of `instructor_notifications` and grouped them:

- The "Don't forget — enquiry from ..." burst you saw is **not** technical duplication. Each row has a different `reference_id` (a different enquiry record), all written in the same second by the 20:00 UTC reminder job. Two are both named "dave kebab" but they are two separate enquiry rows.
- There **are** genuine duplicates, in other categories:
  - `live_starting_soon` — same `reference_id` inserted 4x within 150ms (26 Aug), 4x (24 Aug), 2x (21 Aug). Older ones were single, so the fan-out started recently.
  - `bitesize_upload` — 2x per video, identical timestamps.
  - `showcase_report` — 2x, identical timestamp.

Not yet confirmed: which writer creates those three types. They are not inserted anywhere in this repo (only read/rendered), so they come from a database trigger, scheduled job, or an edge function outside this codebase. Confirming that is step 1 — I do not want to guess a cause.

## Plan

1. **Identify the writers.** Inspect the database for triggers on the live/bitesize/showcase tables, and for scheduled jobs, to find what inserts these three notification types and why it runs more than once per event. (Read-only inspection; I will report what I find before changing it.)
2. **Make notification writes idempotent at the source.** Add a uniqueness guarantee so the same event can never produce two rows: a unique index on `(instructor_id, type, reference_id)` for event-style types, with inserts changed to upsert/do-nothing. This kills duplicates regardless of which job fires twice.
3. **Add a dedupe guard to the in-repo reminder job** (`send-lesson-reminders`): it already skips repeats for `overdue_payment` and `pupil_churn`, but `lesson_tomorrow`, `test_tomorrow`, and `tracking` have no such check. Give them the same "was this already sent recently?" lookup so a double cron run cannot double-notify.
4. **Reduce the enquiry-reminder noise (optional, your call).** Since these are real separate enquiries, the options are: leave as-is, cap to a limited number of individual reminders per run, or collapse them into one grouped notification ("7 enquiries awaiting a reply"). Tell me which you prefer and I will build it.
5. **Verify.** Re-query the notification table after the next scheduled run and confirm one row per event.

## Technical notes

- Step 2 needs a migration: `CREATE UNIQUE INDEX ... ON public.instructor_notifications (instructor_id, type, reference_id) WHERE reference_id IS NOT NULL` plus `ON CONFLICT DO NOTHING` on the inserting code/trigger. Existing duplicate rows have to be collapsed in the same migration before the index can be created.
- Push delivery (`send-push`) is downstream of the row insert, so fixing the insert also stops the duplicate phone alerts and keeps the badge count accurate.
- Step 3 is a change to `src/routes/api/public/send-lesson-reminders.ts` only, mirroring the existing `overdue_payment` dedupe pattern.
