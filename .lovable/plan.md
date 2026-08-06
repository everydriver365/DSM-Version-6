Add edit/cancel test actions to the Driving tests page

## Problem
The main Driving tests page (`/tests`) lists every test with a "Log result" button, but there is no way to edit an upcoming test's date, time, centre or examiner, or to cancel it. The dedicated `/upcoming-tests` page already has a 3-dot menu with Edit and Cancel, so the logic exists but is not reachable from the main tests page the user is currently on.

## Goal
Add a consistent edit/cancel action menu to every test card on `/tests` so users can update test details without leaving the page.

## Proposed changes

### 1. Add a 3-dot menu to `TestCard` in `src/routes/tests.tsx`
- Place the menu trigger in the top-right corner of each `TestCard` (matching the style of `/upcoming-tests.tsx`).
- Dropdown items: "Edit test" and "Cancel test".
- Only show the menu for tests that are not in a terminal state (passed, failed, abandoned, cancelled). Past-result cards may omit it.

### 2. Reuse existing sheet infrastructure
- Add `editFor` and `cancelFor` state to the `TestsPage` component.
- "Edit test" opens a new `EditTestSheet` (or an adapted `AddTestSheet` variant) pre-filled with the selected test's pupil, date, time, centre, examiner names, and transmission/vehicle-owner.
- "Cancel test" opens the same `BottomSheetV2` confirmation flow used in `/upcoming-tests.tsx`, clearing the test fields and logging a note if a reason is provided.

### 3. Keep the "Log result" button behaviour
- Existing `LogResultSheet` is unchanged; it remains visible for upcoming/overdue tests.
- The new edit/cancel menu does not replace the log-result button; it sits beside it.

### 4. After save/cancel
- Refresh the test list via the existing `loadTests(userId)` helper so the card updates immediately.
- Show `toast.success` confirmations consistent with the rest of the app.

## Files to change
- `src/routes/tests.tsx` — add menu state, dropdown, `EditTestSheet` component, and cancel confirmation sheet.

## Out of scope
- No schema changes; pupils table already holds all test fields.
- No changes to `/upcoming-tests.tsx`; that page already has edit/cancel and is not the source of the user's confusion.
- No changes to the Log result sheet.

## Acceptance criteria
- Each upcoming test card on `/tests` shows a 3-dot menu.
- Tapping it opens Edit/Cancel options.
- Edit changes persist to the pupil row and refresh the list.
- Cancel clears the test and shows a confirmation toast.
- Terminal-status cards (passed/failed/abandoned/cancelled) do not show the menu.
