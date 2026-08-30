# Move the FAB quick-add pill menu up

## Problem
On the home page floating action button (FAB), the bottom two pills in the quick-add menu are partially obscured. The menu container is currently anchored too low relative to the bottom navigation / safe-area inset, so the last items sit under or too close to the bottom chrome.

## Current code
In `src/routes/home.tsx` the pill menu is rendered as a fixed-position column:

- Menu container: `bottom: 148`
- FAB button: `bottom: calc(80px + env(safe-area-inset-bottom, 0px))`

Because the menu uses a fixed `148px` offset while the FAB moves up with the safe-area inset, the gap between the menu and the FAB shrinks on devices with larger home indicators. The bottom pills can end up clipped by the bottom nav or hidden behind the FAB button itself.

## Changes
Only `src/routes/home.tsx` will be touched, specifically the fixed-position quick-add pill menu and its containing `div`.

1. Increase the menu container’s `bottom` offset so it clears the FAB and bottom nav on all screen sizes.
2. Tie the offset to `env(safe-area-inset-bottom)` so it scales consistently with the FAB button rather than using a fixed pixel value.
3. Keep the existing pill styling, stagger animation, and `runQuickAdd` behaviour unchanged.
4. Add a small `maxHeight` / `overflowY: 'auto'` guard so the menu remains usable on very short viewports if the taller offset still leaves insufficient vertical space.

## Verification
- Open `/home` in the mobile preview.
- Tap the green FAB to expand the quick-add pill menu.
- Confirm all 9 pills are fully visible and tappable, including the bottom two (`Log enquiry` and `Log call`).
- Confirm the menu closes when tapping the backdrop or the FAB.
