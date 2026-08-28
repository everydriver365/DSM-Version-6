# Fix: Upcoming tests tile misses tests added as test-day lessons

## What's wrong

The home "Upcoming tests" tile reads test data only from the **pupil record** (`pupils.test_date / test_time / test_centre`, home.tsx:2204-2221), and picks the earliest future one for the "next test" card.

But when a test is added through Add Lesson with "Test day" switched on, the app only writes a **lesson row** with `lesson_type: 'test'` (AddLessonSheet.tsx:499/574/623, and the same in lesson edit). It never sets the pupil's `test_date`, `test_time` or `test_centre`.

So any test created that way is invisible to the tile — and to the Upcoming Tests page, which reads the same pupil columns. Only tests entered via the pupil's test fields show up.

A second, smaller issue: the tile does not filter on `test_status`, so a pupil left with a future date but a `passed` / `failed` / `cancelled` status would still be counted as the next test.

## The fix

1. **Write the pupil test fields when a test-day lesson is saved.** In Add Lesson and in lesson edit, when "Test day" is on and a pupil is selected, also update that pupil's `test_date`, `test_time`, `test_centre`, and set `test_status = 'upcoming'`. Applies to both create and update paths.
2. **Clear them when a test-day lesson is turned back into a normal lesson** on edit (blank the three fields), so stale tests don't linger.
3. **Filter the tile by status**: exclude pupils whose `test_status` is `passed`, `failed` or `cancelled` when choosing the next test and the stacked list.
4. **Backfill existing test lessons** (one-off SQL in `db/`): for every future `lessons` row with `lesson_type = 'test'`, copy date, time and pickup location onto the pupil's test fields where the pupil has no test date set. This makes Luke Shaw's and any other already-added test appear immediately.

## Technical notes

- Files: `src/components/lessons/AddLessonSheet.tsx`, `src/routes/lessons.edit.$id.tsx`, `src/routes/home.tsx` (tile filter at ~7102), plus a new `db/062_backfill_pupil_test_fields.sql`.
- Test time on a test-day lesson is stored separately (`testTime`) from the pickup time — the pupil's `test_time` gets the test time, not the pickup time.
- The test centre comes from the test-day `testCentre` field (also stored as `pickup_location`).
- No schema change needed; `pupils.test_*` columns already exist.
- The Upcoming Tests page and the home tile share the same source, so both are fixed by the same change.
