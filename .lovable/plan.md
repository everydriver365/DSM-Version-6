# Pupil dropdown on Take payment

Replace the free-text "For (pupil)" input on `/take-payment` with a select that lists the instructor's current (non-archived, non-cancelled, non-inactive) pupils.

## Changes (only `src/routes/take-payment.tsx`)

1. Add state: `pupils: { id: string; name: string }[]` and replace `pupilName: string` with `pupilId: string`. Derive `pupilName` from the selected row when sending to Ryft / inserting `lesson_history`.
2. On mount, fetch pupils for the signed-in instructor:
   - `supabase.auth.getUser()` → `instructor_id`
   - `supabase.from("pupils").select("id, name").eq("instructor_id", uid).is("deleted_at", null).not("status", "in", "(inactive,archived,cancelled)").order("name")`
3. Render a `<select>` styled to match the compact "For/Description" row (same height, border, font). First option: `"For (optional) — select pupil"` with empty value. Keep the Description text input next to it as today.
4. Pass `pupil_id` and the resolved `pupil_name` into both `create-ryft-payment` and the `lesson_history` insert. If no pupil selected, send neither and `lesson_history.pupil_id` is `null` (today it's already null on the cash path).
5. Full-screen QR overlay shows the resolved pupil name (unchanged behaviour, just sourced from the selected pupil).

## Out of scope
- No edits to `EndLessonWizard`, `InstructorTopBar`, or any other file.
- No schema changes — uses existing `pupils` columns (`id`, `name`, `instructor_id`, `status`, `deleted_at`).
