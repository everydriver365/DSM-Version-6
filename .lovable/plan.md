# Extend deletePaymentRecord to also soft-delete matching payments row

## Problem

`deletePaymentRecord` in `src/routes/payments.tsx` currently soft-deletes the `lesson_history` row and reverses the lesson/pupil balance, but it leaves the matching `payments` row intact. Reporting surfaces that read from `payments` (tax, earnings, month-end, performance) therefore continue to show the payment as real income after deletion.

## Fix

After the existing `lesson_history` soft-delete PATCH in `deletePaymentRecord`, add a matching soft-delete against the `payments` table using the columns available on the `lesson_history` record: `instructor_id`, `pupil_id`, `lesson_cost` (as amount), and `created_at` (as paid_at).

## Changes

1. In `src/routes/payments.tsx`, after the `lesson_history` PATCH at lines 134-138, insert a PostgREST lookup against `payments` to find a matching row by:
   - `instructor_id=eq.${record.instructor_id}`
   - `pupil_id=eq.${record.pupil_id}`
   - `amount=eq.${record.lesson_cost}`
   - `paid_at=eq.${record.created_at}`
   - `deleted_at=is.null`

2. If a matching row is found, PATCH it with `deleted_at = new Date().toISOString()`.

3. If no matching row is found, emit `console.warn("[deletePaymentRecord] no matching payments row found to soft-delete", record)` and continue. This is non-fatal because historical records may predate the payments backfill.

4. Place this new block after the `lesson_history` soft-delete and before the lesson/pupil balance reversal logic that follows.

## Scope

Only `src/routes/payments.tsx`. No changes to the lesson/pupil balance reversal logic, the confirmation prompt, or any other part of the function.
