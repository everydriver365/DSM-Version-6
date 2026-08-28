# Fix overlapping FABs on Schedule page

## Problem
The Schedule page shows two floating action buttons at the same bottom-right corner:
- The **global quick-menu FAB** rendered in `src/routes/__root.tsx` at `bottom: calc(env(safe-area-inset-bottom) + 88px)`.
- The **page-level "Add to schedule" FAB** rendered in `src/routes/schedule.tsx` at `bottom: calc(80px + env(safe-area-inset-bottom, 0px))`.

These positions are only ~8 px apart, so the buttons overlap.

## Solution
Hide the global quick-menu FAB on the `/schedule` route, leaving only the page-level "Add to schedule" FAB. This matches the existing pattern used for `/test-swap`, which already hides the global FAB.

## Implementation
1. In `src/routes/__root.tsx`, update:
   ```ts
   const hideFloatingMenuExact = new Set(["/test-swap"]);
   ```
   to:
   ```ts
   const hideFloatingMenuExact = new Set(["/test-swap", "/schedule"]);
   ```
2. Verify the schedule page still renders its own "Add to schedule" FAB and that no other page is affected.

## Files changed
- `src/routes/__root.tsx` (one line)
