# Match PRO Radio's expanded player to the Schedule sheet design

The Radio experience currently uses a hand-rolled full-screen panel with its own navy header, close chevron and layout. Sheets opened from the Schedule page use the shared DSM sheet shell (rounded top, grab handle, drag-to-dismiss, large navy title, white circular close button, canvas background, sticky footer). Radio should use the same shell.

## What changes

Scope: PRO Radio only.

1. The expanded player (tapping the mini player) becomes a standard DSM bottom sheet:
   - Rounded top corners over a dimmed backdrop, grab handle, drag-down-to-dismiss, Escape to close.
   - Title "PRO Radio" with the station name as subtitle, white circular close button top-right (replacing the navy header bar with chevron/dots).
   - Canvas background, scrollable body containing the existing now-playing card and station grid, unchanged in content.
   - Play/pause control pinned in the sheet footer area so it stays reachable while scrolling stations.
2. The mini player bar keeps its current look and behaviour.
3. The `/radio` full page keeps its page chrome (it is a route, not a sheet), but its now-playing card and station tiles stay visually identical to the sheet version so both read as one design.

## Technical notes

- Files touched: `src/components/radio/ProRadioPlayer.tsx` only (plus `src/routes/radio.tsx` only if a shared tile component is extracted).
- Use `BottomSheet` from `@/components/dsm/BottomSheetV2` (same component Schedule's sheets use) with `title`, `subtitle`, `onClose`, `footer`.
- Remove the custom fixed full-screen container, sticky navy header, and manual safe-area padding; the shell handles max height, safe area and focus trapping.
- Keep all radio state/logic (`useProRadioContext`, favourites, station selection) untouched.
