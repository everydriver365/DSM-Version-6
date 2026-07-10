## Problem

Tapping the `+` on the Today's lessons tile opens `/lessons/new`, but pressing **Save lesson** does nothing (no error, no navigation). Adding a lesson via the Quick Actions "Add lesson" button — same route, same form — saves correctly.

Since both entry points call `navigate({ to: "/lessons/new" })` and land on the identical `NewLessonPage`, the form itself isn't the bug. The difference has to be in what the `+` tap leaves behind on the page just before navigation.

## Likely cause

The `+` button lives inside `SwipeableStatsCard`, which owns pointer/touch drag gestures. The button calls `stopPropagation` on `onMouseDown/Up` and `onTouchStart/End`, but that also prevents the swipe container from cleanly *ending* its own gesture — so it can leave the card mid-drag with an unresolved pointer capture. On mobile that captured pointer is later consumed by the next tap on `/lessons/new`, so pressing **Save** fires a phantom event on the form's background instead of submitting.

## Plan

1. Reproduce the exact failure with Playwright at 390×739 (mobile viewport): open `/home`, tap the `+`, fill the form, tap **Save lesson**, and capture console + network. Compare against a Quick Actions run to confirm the difference.
2. Based on the repro, apply the minimal fix in `src/routes/home.tsx` only:
   - Stop the `+` button from interfering with the swipe container's gesture lifecycle. Instead of `stopPropagation` on every pointer/touch phase, use a `pointerdown` handler that calls `e.stopPropagation()` once and delegate navigation to the button's normal `onClick`. This lets the swipe container's `pointerup` fire and release any captured pointer.
   - If the repro shows the swipe container calling `setPointerCapture`, also release it on the button's `pointerdown` (`(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)` on the swipe root via a ref) — still contained in `home.tsx`.
3. Re-run the Playwright repro to confirm Save now creates the lesson and navigates to `/schedule`.

## Scope

- **Edit:** `src/routes/home.tsx` only (the `+` button block inside `SwipeableStatsCard`).
- **Do not touch:** `src/routes/lessons.new.tsx`, DSM components, or any other file.
