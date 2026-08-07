# Notification banner contrast fix

The in-app notification banner (`src/components/dsm/EventToast.tsx`) currently uses the same navy background (#0B1F3A) as the app header, so it visually blends into the page instead of floating above it. This plan makes the banner lighter and more distinct while keeping the same structure and behavior.

## What will change

- **Background**: switch from `#0B1F3A` to a clean white/light card background.
- **Text/icons**: switch from white-on-navy to navy-on-white (`#0B1F3A` text, secondary `rgba(11,31,58,0.55)` meta text).
- **Top accent bar**: keep the event-type color dot and title, but make the top bar light and use the event color for a stronger 2px top border or a saturated left accent.
- **Elevation**: increase the shadow so the banner clearly sits above the page surface.
- **Action button**: keep the blue pill but make it a more prominent primary fill on the light background.
- **No behavior changes**: queueing, deduplication, auto-dismiss, swipe-to-dismiss, and tap/Reply/View actions remain exactly as they are.

## Files to touch

- `src/components/dsm/EventToast.tsx` — restyle the banner container, top bar, text colors, and action button.

## Verification

- After the change, trigger a banner (e.g., by emitting a live event) and confirm it is visually separated from the navy header and the home page background.
