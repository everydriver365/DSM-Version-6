# Toast redesign: make notifications visible against the navy background

The global Sonner toast (`src/components/ui/sonner.tsx`) currently uses the same navy background (`#0B1F3A`) as the app header and many pages, so it visually disappears into the page surface. The uploaded screenshot shows the "Route saved ✓" toast sitting flush against the navy header with no separation.

## What will change

- **Background**: switch from `#0B1F3A` to a clean white/light card surface (`#FFFFFF` or `#F8FAFC`) so the toast floats above the page.
- **Text/icons**: switch from white-on-navy to navy-on-white (`#0B1F3A` primary text, `#6B7686` secondary/meta text).
- **Accent system**: keep semantic left-border accents for success/error/info/warning, but make them stronger (4 px saturated colour) against the light background.
- **Elevation**: increase shadow depth so the toast clearly sits above the navy header and page background.
- **Action/close buttons**: restyle the close button and any action pill for the light theme (dark text, subtle hover states).
- **Event toast alignment**: update `src/components/dsm/EventToast.tsx` to use the same light-card styling so live-event banners are consistent with standard toasts.
- **No behaviour changes**: duration, swipe-to-dismiss, queueing, positions, and action callbacks stay exactly the same.

## Files to touch

- `src/components/ui/sonner.tsx` — restyle the global `Toaster` container, text, close button, and semantic accent classes.
- `src/components/dsm/EventToast.tsx` — align the live-event banner styling with the new light toast treatment (background, text colours, shadow, action button).

## Verification

- Trigger a standard toast (e.g. save a route in `/live`) and confirm it appears as a light card with a visible shadow over the navy background.
- Trigger a live event toast (if available) and confirm it uses the same light treatment while keeping its event-colour left accent.
