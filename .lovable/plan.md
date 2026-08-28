# Header spacing and microphone/FAB redesign

## Part 1 — Header spacing

Current state: the global header in `src/routes/__root.tsx` has a 44px logo, a 24px hamburger icon with no wrapper, 20px search/bell icons inside 32px wrappers, and an 18px counter badge.

Goal: hamburger, bell, and badge align correctly with the larger logo on all screen sizes.

Changes:
- Wrap the hamburger in the same-size touch target as the search and bell icons.
- Standardise all three header icons to the same size (22–24px).
- Resize and reposition the unread badge so it sits cleanly on the bell icon.
- Update the global header spacer (`wrapperStyle.paddingTop`) to match any header height change so page content stays flush under the header.

## Part 2 — Microphone becomes voice assistant, menu moves to Home FAB

Current state: the centre microphone button in `src/components/dsm/BottomNav.tsx` dispatches `dsm-open-command-palette` and opens the search/jump menu.

Goal: the microphone button triggers a voice assistant; the current command-palette menu is reachable from a floating action button on the home page.

Changes:
- In `BottomNav.tsx`: change `CenterMicButton` to dispatch a new `dsm-open-voice-assistant` event and show a placeholder toast/sheet (the full assistant is not built yet).
- In `src/routes/home.tsx`: add a floating action button that dispatches `dsm-open-command-palette`.
- Keep `CommandPalette.tsx` listening to `dsm-open-command-palette` so the FAB opens the same menu.
- Ensure the FAB clears the bottom navigation and any page content.

## Files touched
- `src/routes/__root.tsx`
- `src/components/dsm/BottomNav.tsx`
- `src/routes/home.tsx`

## Verification
- Preview `/home` on mobile: header icons align with the centred logo, no grey gap appears, and the new FAB opens the command palette.
- Tap the bottom-nav microphone: it triggers the voice-assistant placeholder instead of the menu.
