# Fix broken payments soft-delete query in home.tsx

## Bug

In `src/routes/home.tsx` around line 6929-6934, the earnings delete handler soft-deletes legacy `payments` rows by matching `.eq("lesson_id", row.id)`. The `payments` table has no `lesson_id` column, so this query silently fails every time.

## Fix

Replace the broken match with a composite match on the columns that actually exist: `instructor_id`, `pupil_id`, `amount`, and `paid_at`.

## Changes

1. Add `paid_at` to the `lessonRow` select so the original payment timestamp is available for matching.
2. Replace the payments soft-delete query:

```typescript
const { error: payErr } = await supabase
  .from("payments")
  .update({ deleted_at: nowIso })
  .eq("instructor_id", userId)
  .eq("pupil_id", lessonRow?.pupil_id)
  .eq("amount", lessonRow?.amount_due)
  .eq("paid_at", lessonRow?.paid_at)
  .is("deleted_at", null);
if (payErr) console.error("[home] payments soft-delete error", payErr);
```

## Scope

Only `src/routes/home.tsx`. No changes to the lessons table update, the `account_balance` reversal logic, or any other section.
