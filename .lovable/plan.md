# Undo a cancellation from the success toast

After cancelling a lesson, the "Lesson cancelled" toast gains an **Undo** button for 8 seconds. Tapping it puts the lesson back exactly as it was.

## How it works

The tricky part is money. Refunds, retained fees and prepaid-hour returns are hard to unwind cleanly once written. So the flow changes to:

1. On confirm, only the lesson row is updated (status, payment status, cancellation reason/notes/date) and the calendar event is removed. The toast appears with an Undo button.
2. The financial side — refund, fee retention, full-charge record, prepaid-hour return, and the cancellation audit row — is held back for the 8-second undo window.
3. If you do nothing, the window closes and all the financial writes run exactly as they do today.
4. If you tap Undo, nothing financial ever happened: the lesson is restored to its previous status, payment status and amount due, the cancellation fields are cleared, the calendar event is re-synced, and a short "Cancellation undone" toast confirms it.

Leaving the screen does not lose the pending work — the deferred writes are committed immediately if you navigate away or the app closes the sheet.

## Where it applies

All three cancellation flows get the same behaviour:
- Lesson actions sheet (dot-menu → Cancel)
- Edit lesson page cancel flow
- The dedicated cancellation sheet (policy/fee based)

## Technical notes

- New shared helper `src/lib/cancelLesson.ts` exporting `cancelLessonWithUndo(...)`: performs the lesson-row patch, returns a `commit()` and `undo()` pair, and schedules `commit()` on an 8s timer. `commit()` is idempotent and also fired from a `beforeunload` / unmount guard so deferred writes are never dropped.
- The helper captures the pre-cancel snapshot (`status`, `payment_status`, `amount_due`, `cancellation_reason`, `cancellation_notes`, `cancelled_at`) before patching, and `undo()` writes that snapshot back.
- Toast uses sonner's action API: `toast.success("Lesson cancelled", { duration: 8000, action: { label: "Undo", onClick: undo } })`.
- Post-cancel `navigate({ to: "/home" })` stays; the sonner toaster is global so the Undo button survives the route change.
- Calendar: cancel still calls `google-calendar-sync` with `action: "delete"`; `undo()` calls it with `action: "upsert"` (the same action the edit page already uses when saving) so the event comes back.
- Files touched: new `src/lib/cancelLesson.ts`, plus `src/components/lessons/LessonActionsSheet.tsx`, `src/routes/lessons.edit.$id.tsx`, `src/components/lessons/CancelLessonSheet.tsx`.
