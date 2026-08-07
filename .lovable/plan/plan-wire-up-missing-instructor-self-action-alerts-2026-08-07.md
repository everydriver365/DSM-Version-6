# Plan: Wire up missing instructor self-action alerts

## Goal
Add in-app live alerts for instructor-initiated actions that currently write no `instructor_notifications` row, so the real-time banner in `__root.tsx` can surface them.

## What will be added

1. **Manual lesson creation** (`src/routes/lessons.new.tsx`)
   - After the `lessons.insert(...)` succeeds, insert an `instructor_notifications` row.
   - Type: `lesson_created`, title: `"Lesson booked"`, body: `"<pupil> booked for <date> at <time>"`.
   - Carry `reference_type: "lesson"` and `reference_id: <newLessonId>` so the banner links to the lesson.
   - The root listener will map it to the `booking` event kind because the type contains `lesson`.

2. **Manual refund** (`src/lib/payments.ts`)
   - In `recordRefund`, after the audit and legacy `payments` insert, fetch the pupil name and insert an `instructor_notifications` row.
   - Type: `payment_refunded`, title: `"Refund issued"`, body: `"£<amount> <method> refund to <pupil>"`.
   - To avoid double-alerts when a cancellation also records a refund, add an optional `notify?: boolean` parameter (default `true`) to `recordRefund` and pass `notify: false` from `CancelLessonSheet` cancellation refund path.

3. **End-of-lesson completion** (`src/components/dsm/EndLessonWizard.tsx`)
   - After the `lessons.update({ status: "completed" })` succeeds, insert an `instructor_notifications` row.
   - Type: `lesson_completed`, title: `"Lesson completed"`, body: `"<pupil> — <duration> min lesson completed"`.
   - Carry `reference_type: "lesson"` and `reference_id: <lessonId>`.

4. **New pupil added** (`src/routes/pipeline.tsx`)
   - After the `pupils.insert(...)` succeeds, insert an `instructor_notifications` row.
   - Type: `pupil_added`, title: `"New pupil added"`, body: `"<pupil> added to your pupils"`.
   - The root listener will map it to the `message` event kind (fallback).

## Out of scope
- The admin listing approval/rejection notification in `src/routes/admin.listings.tsx` currently only writes a `message` field, so it displays as "New activity". That is a separate polish fix, not a missing instructor self-action, and can be handled separately if needed.

## Verification
After implementation, typecheck and `bun run build` must pass. The notification banner should appear for each of the four events above when the app is foregrounded.
