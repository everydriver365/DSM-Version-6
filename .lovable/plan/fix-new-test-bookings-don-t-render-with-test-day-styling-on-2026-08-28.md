# Fix: new test bookings don't render with test-day styling on Home

## What's happening

The Home page decides whether a booking is a test day with `isTestLesson()` (src/routes/home.tsx:538), which checks three things in order:

1. `lesson_type` = `test` / `test day` / `driving test`
2. `is_test_day === true`
3. a legacy `"Test day: ..."` prefix in `notes`

Adding a test through the Add Lesson sheet writes `lesson_type: "test"` (src/components/lessons/AddLessonSheet.tsx:499/574/623) — the correct flag.

But the Home page's Supabase queries never request that column. Both the 60-day window query (src/routes/home.tsx:2649) and the "next lesson" query (src/routes/home.tsx:2694) select an explicit column list that omits `lesson_type`, `is_test_day` and `test_centre`. So on Home every lesson comes back with `lesson_type === undefined`, and `isTestLesson()` can only ever return true for old bookings that happen to have the legacy `Test day:` notes prefix. Luke Shaw's new test has the flag in the database but not in the data Home loaded, so it renders as an ordinary lesson: no test styling, no banner.

Side effect of the same gap: the filters at lines 2670 and 2748 compare `l.lesson_type` too, so test days are currently still counted in lesson/earnings/hours stats on Home.

## Fix

In src/routes/home.tsx only:

1. Add `lesson_type, is_test_day, test_centre` to the column list of the 60-day lessons query (line ~2649).
2. Add the same three columns to the next-lesson query (line ~2694).
3. Re-check any other lesson select in that file that feeds a card using `isTestLesson` and add the columns there too.

No schema, styling or logic changes — the test-day layout, red banner and countdown already exist and will start matching once the flag is present.

## Verification

- Typecheck passes.
- Luke Shaw's test appears on Home with the test-day card style and banner.
- Ordinary lessons render unchanged, and test days drop out of the lesson/earnings/hours stats as the existing filters intend.
