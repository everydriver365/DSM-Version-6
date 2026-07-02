## Problem

Jasmine's upcoming lesson doesn't appear on her pupil record because two Supabase queries in `src/routes/pupils.$id.tsx` reference columns that don't exist in the database:

```
column lessons.price does not exist
column pupils.examiner does not exist
```

When either query errors, the pupil record returns `null` and the upcoming-lessons list is empty — so the booked lesson for tomorrow silently disappears from the UI. The home schedule tile (which uses different column names like `amount_due`, `payment_status`, `eol_completed`) still shows Jasmine correctly, confirming the lesson exists.

These bad column references were introduced in the recent pupil-page changes and were never migrated.

## Fix (only `src/routes/pupils.$id.tsx`)

1. **Pupil select** — remove `examiner` from the `.from("pupils").select(...)` list (and drop it from the `Pupil` type / examiner UI reads, defaulting to `null`) so the whole pupil fetch stops 42703-ing.
2. **Upcoming lessons select** — replace the non-existent columns with the ones the `lessons` table actually has (matching what `home.tsx` uses):
   - `price` → `amount_due`
   - `is_paid` → derive from `payment_status === 'paid'`
   - `end_of_lesson_completed` → `eol_completed`
   - drop `lesson_type` if it also doesn't exist (verify by testing; if it errors, remove).
3. **Lesson list rendering** — update the two spots that read `l.price` / `l.is_paid` / `l.end_of_lesson_completed` to use the new field names, keeping the same "£X due", "Paid ✓", "EOL pending" badges.
4. **Examiner edit form** — remove the examiner input and the fallback-save logic for it, since the column doesn't exist. (Can be re-added later once a migration adds the column.)

No other files touched. No schema changes.

## Verification

- Reload Jasmine's pupil page: upcoming lesson for tomorrow appears.
- Console no longer logs `column lessons.price does not exist` or `column pupils.examiner does not exist`.
- Home schedule tile behaviour unchanged.
