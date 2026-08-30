# Map Draw: place vehicle icons reliably, with proper car graphics

Scope: `src/routes/pro-teach_.map.tsx` (plus one small new icon file). No changes to drawing, ruler, arrow, text, save/share, or any other page.

## 1. Fix placement (the blocker)

Reading the tap path, several things can swallow a tap that should drop an icon:

- Touch taps fire `onTouchStart` and then a synthesised `onMouseDown` at the same point, so one tap runs the placement handler twice — the second pass lands on the icon just placed and switches into select/drag instead of leaving a clean placed icon.
- The canvas only accepts input while the mode toggle says "Draw". If the toggle is on "Move map", every tap is ignored with no feedback.
- The toolbar strip and the map both live under the same tap area, so a tap that starts on a pill and ends on the map does nothing.

Work:
- Unify canvas input on Pointer Events (single code path for mouse, touch and pencil) so one tap is exactly one placement.
- When a vehicle/hazard tool is armed, tapping the map always places — never falls through to selection on the same gesture.
- Auto-switch the mode toggle back to "Draw" whenever an icon pill is armed, and show a short "Tap the map to place" hint on the toolbar while a tool is armed.
- Verify end-to-end in a headless browser: arm a car, tap the map, assert exactly one icon appears at the tap point, then drag it and confirm it moves.

## 2. Real car graphics instead of emoji

Today the pills and placed markers are emoji characters, which render differently per device and can't rotate convincingly.

Work:
- Add `src/components/icons/VehicleIcons.tsx` with top-down SVG vehicles (car, van, lorry, bus, motorbike, bicycle, pedestrian) drawn in the app style, colour-driven so one shape covers all four car colours.
- Render those SVGs both in the toolbar pills and as the placed markers, keeping the existing rotate/scale/delete action bar.
- Draw the same shapes onto the canvas for the exported/shared image so what's shared matches what's on screen.

## 3. More vehicle types

Extend the toolbar with: car (blue/yellow/green/red), van, lorry, bus, motorbike, bicycle, pedestrian — grouped and horizontally scrollable, hazards unchanged after the divider.

## Technical notes

- Coordinates stay in CSS pixels; DPR multiplication only happens when drawing to the canvas and in hit-testing (already the case).
- Placed-icon state stays in the memoised overlay component so placement doesn't re-render the whole route.
- Existing saved templates that reference `car-blue` etc. keep working — the new SVG set is keyed off the same type strings.
