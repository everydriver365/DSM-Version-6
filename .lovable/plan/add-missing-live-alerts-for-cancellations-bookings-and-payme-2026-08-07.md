# Add missing live alerts for cancellations, bookings and payments

## Current state
- The unified alert banner (EventToast) is driven by new rows in `instructor_notifications`.
- Already firing:
  - Gap-offer accepted in chat → `instructor_notifications` type `lesson` (`src/routes/messages.$pupilId.tsx`).
  - Course booking (public website) → `instructor_notifications` type `payment` (`src/routes/courses.$id.tsx`).
  - Quote deposit paid → `instructor_notifications` type `payment` (`src/routes/quote.$token.tsx`).
- Not firing today:
  - Manual payment recordings through `recordPayment` in `src/lib/payments.ts` do not insert any notification.
  - Lesson cancellations using `CancelLessonSheet` do not insert a notification, and `cancelled_by` is not set to `pupil` when the reason is pupil-related.

## Goal
Wire up the missing notification inserts so that:
- A manually recorded payment triggers an in-app alert.
- A lesson cancelled for a pupil-related reason (`Pupil cancelled`, `Pupil no-show`) triggers an in-app alert and is marked as `cancelled_by: pupil`.
- Payment alerts get a dedicated credit-card icon instead of the generic message icon.

## Implementation steps

### 1. Payment notification in `src/lib/payments.ts`
- In `recordPaymentCore`, after the `payments` table insert succeeds, insert an `instructor_notifications` row.
- Type: `payment_received`.
- Title: `Payment received`.
- Body: includes the pupil name, amount and method (e.g. `£{amount} {method} from {pupilName}`).
- Fetch the pupil name once from `pupils(id, name)` if not already loaded.
- Catch/log errors silently so a notification failure does not break the payment flow.

### 2. Cancellation notification in `src/components/lessons/CancelLessonSheet.tsx`
- When `reason` is `Pupil cancelled` or `Pupil no-show`, add `cancelled_by: "pupil"` to the `lessonPatch` sent to `cancelLessonWithUndo`.
- After the cancellation is persisted, insert an `instructor_notifications` row.
- Type: `lesson_cancelled_by_pupil`.
- Title: `Lesson cancelled by pupil`.
- Body: includes pupil name and the chosen reason (e.g. `{pupilName} — {reason}`).
- Catch/log errors silently so a notification failure does not break cancellation.

### 3. New `payment` alert kind in `src/components/dsm/EventToast.tsx`
- Add `"payment"` to `LiveEventKind`.
- Import `CreditCard` from `lucide-react`.
- Add a `payment` case to `styleFor` returning a green-tint treatment and a credit-card icon.

### 4. Map `payment` notifications in `src/routes/__root.tsx`
- In the realtime listener mapping, if `type.includes("payment")` return kind `"payment"` before the fallback `"message"`.
- Add a `reference_type === "payment"` branch in `getNotificationUrl` so payment alerts link to `/payments`.

### 5. Validation
- Run TypeScript checks (`tsgo` or `bunx tsc --noEmit`).
- Run the app locally, trigger a payment and a cancellation, and confirm the alert banner appears with the correct icon, title, and link.

## Files changed
- `src/lib/payments.ts`
- `src/components/lessons/CancelLessonSheet.tsx`
- `src/components/dsm/EventToast.tsx`
- `src/routes/__root.tsx`
