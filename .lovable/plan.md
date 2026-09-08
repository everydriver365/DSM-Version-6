# Phase 4 — Double-booking safety

Today nothing stops the same instructor being booked twice at the same time. A lesson can be saved on top of another lesson, on top of a busy Google event, on top of time off, or on top of a recurring block — from any of the four places lessons get created. There is no check when saving and no protection in the database.

This phase adds both: a clear warning before saving, and a final safety net in the database so a clash can never be stored, even if two devices save at the same moment.

## What you will see

When you add or edit a lesson at a time that clashes, the save is stopped and you get a plain message saying exactly what it clashes with, for example:

- "Clashes with Sarah Jones 13:00–14:00"
- "Clashes with Dentist (Google Calendar) 13:00–14:00"
- "You're marked as off on this date"
- "Falls inside a blocked slot (Lunch)"

Two softer cases only warn, with a "Book anyway" option:

- Not enough travel time before or after (your buffer setting)
- Outside your normal working hours for that day

Nothing changes when there is no clash — saving works exactly as now.

## Scope

Checks run for the instructor's own diary and for the pupil (the same pupil cannot be in two lessons at once). Cancelled and deleted lessons are ignored. Google events marked as not blocking availability are ignored, matching Gap Filler.

## Technical detail

New shared module `src/lib/bookingConflicts.ts`:

- `checkLessonConflict({ instructorId, pupilId, date, time, durationMinutes, excludeLessonId })`
- Reads the same sources the availability engine already uses: `lessons` (excluding `deleted_at`, `cancelled`), `calendar_blocks` where `source in ('external_calendar','ics_inbound')` and `blocks_availability` is true, recurring blocks, time off, instructor working hours and `per_day_hours`, and `lesson_buffer_after`.
- Returns `{ blocking: Conflict[], warnings: Conflict[] }` with human-readable labels. No new tables, no changes to `gapDetection.ts` or `pupilMatching.ts`.

Call sites updated to run the check before insert/update and surface the result:

- `src/components/lessons/AddLessonSheet.tsx`
- `src/routes/lessons.new.tsx`
- `src/routes/courses.$id.tsx` (booking insert)
- `src/routes/messages.$pupilId.tsx` (quick booking insert)

For recurring series, every generated occurrence is checked; clashing dates are listed and skipped rather than silently created.

New guarded migration `db/068_lessons_no_double_booking.sql`:

```sql
create extension if not exists btree_gist;

alter table public.lessons
  add column if not exists lesson_span tsrange
  generated always as (
    tsrange(
      (lesson_date + lesson_time),
      (lesson_date + lesson_time) + make_interval(mins => coalesce(duration_minutes, 60)),
      '[)'
    )
  ) stored;

alter table public.lessons
  add constraint lessons_no_overlap
  exclude using gist (
    instructor_id with =,
    lesson_span with &&
  ) where (deleted_at is null and status not in ('cancelled'));
```

Wrapped so it is safe to re-run, and it reports any existing overlapping rows instead of failing silently if the constraint cannot be created. Times are stored as London wall-clock, so a plain timestamp range is correct and immutable.

The database error code `23P01` is translated into the same friendly clash message in the UI.

## Not in this phase

- Travel-distance awareness (postcode/drive-time) — later phase
- Google webhooks and multiple calendars — later phase
- No changes to Schedule display, calendar sync, SMS, pupil matching, the gap engine, or `capacitor.config.ts`

## Verification

- Full test suite plus new unit tests for `checkLessonConflict` (lesson clash, Google event clash, non-blocking Google event allowed, time off, buffer warning, edit-self excluded)
- TypeScript check
- Manual: try to book over an existing lesson and over a visible Google event; confirm both are refused
