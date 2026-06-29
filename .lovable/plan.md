# Soft-delete lessons entered in error

Add a **Delete lesson** action to the lesson detail page that performs a soft delete (`deleted_at = now()`). All list queries (`schedule`, `home`, pupil history, earnings) already filter `deleted_at IS NULL`, so the lesson disappears everywhere immediately and stays recoverable in the database.

## Changes — `src/routes/lessons.$id.tsx` only

1. Add a **"Delete lesson"** button below the existing "Cancel lesson" button — red outlined, clearly destructive and distinct from cancel.
2. Tapping it opens the existing `ConfirmDialog`:
   - Title: "Delete this lesson?"
   - Message: "This removes it from your schedule and reports. Use Cancel instead if the pupil cancelled — that keeps the record and any fee."
   - Confirm label: "Delete"
3. On confirm:
   - `UPDATE lessons SET deleted_at = now() WHERE id = $id`
   - `toast.success("Lesson deleted")`
   - `navigate({ to: "/schedule" })`
4. No pupil balance adjustments and no notifications — this is the "entered in error" path, not a cancellation.

## Out of scope

- No bulk delete from the schedule list.
- No "Restore deleted lessons" UI (data is preserved in DB; ask if you want a trash screen later).
