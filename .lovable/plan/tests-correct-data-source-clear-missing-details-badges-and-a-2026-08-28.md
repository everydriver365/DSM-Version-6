# Tests: correct data source, clear "missing details" badges, and an edit screen

Three connected pieces of work on driving tests.

## 1. Fix the source of truth (approved earlier, not yet built)

The home "Upcoming tests" tile and the Upcoming Tests page both read tests from the pupil record (`pupils.test_date / test_time / test_centre`). Adding a test through Add Lesson with "Test day" on only writes a `lessons` row with `lesson_type: 'test'` — it never touches those pupil fields, so those tests never appear.

- When a test-day lesson is created or edited, also write the pupil's `test_date`, `test_time`, `test_centre` and `test_status = 'upcoming'`.
- When a test-day lesson is switched back to a normal lesson on edit, clear those pupil fields.
- Exclude `passed` / `failed` / `cancelled` statuses from the home tile's "next test" selection.
- One-off backfill SQL: for future `lessons` rows with `lesson_type = 'test'`, copy date, time and pickup location onto the pupil's test fields where no test date is set. This surfaces Luke Shaw's test and any others already added.

## 2. "Details missing" badge

Right now blank centre/time just render as "Test centre TBC" text with no explanation, so it looks like a bug.

- On the home Upcoming tests tile and on each row of the Upcoming Tests page, show an amber "Details needed" pill whenever the test centre or test time is missing.
- Under it, a short line naming what's missing: "Test centre not set", "Test time not set", or both.
- The pill is tappable and opens the test edit screen straight to the missing field.
- When everything is present, no pill — the card looks exactly as it does today.

## 3. Test edit screen

Replace the current partial edit sheet (date/time/centre only, and only on the Upcoming Tests page) with one shared edit sheet used from both the tile and the list.

Fields:
- **Pupil** — picker of the instructor's active pupils; changing it moves the test to the new pupil and clears it from the old one.
- **Date** and **Time**.
- **Test centre** — existing address lookup.
- Optional status control (upcoming / passed / failed) kept as it is today.

Behaviour:
- Saving writes the pupil test fields and, when the test came from a test-day lesson, updates that lesson's `lesson_date`, `lesson_time` and `pickup_location` too, so the schedule and the tile stay in step.
- The banner/badge style updates immediately after save (badge disappears once the centre and time are filled in).

## Technical notes

- Files: `src/components/lessons/AddLessonSheet.tsx`, `src/routes/lessons.edit.$id.tsx`, `src/routes/home.tsx` (tile around line 7102), `src/routes/upcoming-tests.tsx`, a new shared `src/components/tests/TestEditSheet.tsx`, and a new `db/062_backfill_pupil_test_fields.sql`.
- The test time on a test-day lesson is stored separately from the pickup time; the pupil's `test_time` gets the test time.
- Matching a pupil test back to its lesson row: instructor + pupil + `lesson_type = 'test'` + same date.
- No schema change; `pupils.test_*` columns already exist.
- Colours follow the existing tokens (amber `#FEF3C7` / `#B45309` for the warning pill, navy and brand blue elsewhere).
