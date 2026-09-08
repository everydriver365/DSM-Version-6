# Gap Filler — Fix hidden "Send offers" action after selecting pupils

## Problem
On the Gap Filler screen, tapping a pupil row correctly highlights the row (the selected state updates), but the fixed bottom "Send to N pupils" bar is not visible to the user, so no next action appears to be available.

## Goal
Make the transition from "pupil selected" to "send offer" obvious and reachable on all screen sizes, especially the small mobile viewport where the issue is observed.

## What will change (only `src/routes/gaps.tsx`)
1. **Add a visible inline summary when pupils are selected**
   - Render a compact sticky bar directly above the pupil list (not only at the bottom of the page) that shows how many pupils are selected and a primary "Send offers" button.
   - Keep the existing bottom fixed bar as a fallback but ensure it sits above safe-area insets and is never clipped.

2. **Improve selected-state clarity**
   - Add a checkmark icon / stronger border to selected rows so it is unambiguous that the tap worked.

3. **Fix potential fixed-position clipping**
   - Audit `position: fixed; bottom: 0` styles for the send bar and adjust `z-index`, `padding-bottom` and `transform` to ensure it renders above the page content on short viewports.
   - Add `max-height` / `overflow` handling so the pupil list leaves room for the bar.

4. **Empty-selection hint**
   - If no pupil is selected, the inline bar shows "Select one or more pupils to offer this slot" instead of hiding the action entirely.

## What will NOT change
- Gap detection, pupil matching, SMS queue, `send-sms` Edge Function, database schema, or `capacitor.config.ts`.
- The offer/SMS logic itself; only the visibility and placement of the existing action controls.

## Verification
- Run full test suite (`bun test`) and TypeScript check.
- Verify on mobile viewport that selecting a pupil immediately reveals the Send offers action without scrolling.
