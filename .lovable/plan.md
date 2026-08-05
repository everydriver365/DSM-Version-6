# Save and show cancellation reason + notes

Right now only the dedicated cancel sheet stores the reason properly. The other two cancel flows squash the reason and note into the lesson's general notes field, and no screen shows them back to you.

## What changes

**1. Store the reason properly everywhere**

The `lessons` table already has `cancellation_reason`, `cancellation_notes` and `cancelled_at` columns. Both remaining cancel flows will write to those columns instead of appending text to the lesson's notes:

- Lesson actions sheet (dot-menu → Cancel)
- Edit lesson page cancel flow

Each will also write an audit row to lesson history recording the reason, the note and the charge outcome (no charge / fee retained / full charge), so the cancellation is traceable alongside the money side. The dedicated cancel sheet already writes the columns; it gains the matching history row so all three behave the same.

**2. Show it on the lesson details page**

For a cancelled lesson, a red-tinted card below the status row showing:
- Cancelled on <date>
- Reason
- Notes (only when present)
- Charge outcome line pulled from the history row

**3. Show it on the schedule page**

Cancelled lesson rows keep their strikethrough styling and gain a single small red line underneath with the reason (notes are not shown here to keep rows compact). Tapping the row still opens the lesson, where the full detail is visible.

## Technical notes

- Files touched: `src/components/lessons/LessonActionsSheet.tsx`, `src/routes/lessons.edit.$id.tsx`, `src/components/lessons/CancelLessonSheet.tsx`, `src/routes/lessons.$id.tsx`, `src/routes/schedule.tsx`.
- No migration needed — `db/007_lesson_cancellation.sql` already adds the three columns.
- `lessons.$id.tsx` and `schedule.tsx` select lists must be extended with `cancellation_reason, cancellation_notes, cancelled_at`.
- History row shape follows the existing `lesson_history` insert used by the full-charge branch (`instructor_id`, `pupil_id`, `notes`, `payment_status`, `created_at`), with a `£0`/`amount_paid` value matching the actual charge outcome so reports stay correct.
- Existing refund/prepaid-hour logic and Google Calendar sync are left untouched.
