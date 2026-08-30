# Fix icon placing and map panning on PRO Teach → Map Draw

Scope: `src/routes/pro-teach_.map.tsx` only.

## What I found in the code

**Panning genuinely does not exist.** The map is a Google *Static Maps* image painted as a CSS background on the wrapper div. The "Pan" toggle only disables the drawing canvas — there is no drag handler anywhere and nothing that ever changes `coords`, so the map physically cannot move. Zoom buttons work because they refetch the image; pan has no equivalent.

**Icon placing has two confirmed traps** in the current logic:

1. The car/hazard pills toggle: tapping the same pill twice sets the type back to `null` while leaving the tool as "car"/"hazard". `placeIcon` then returns silently — taps on the map do nothing at all, with no feedback.
2. Once an icon is selected, the first tap anywhere empty only deselects (it returns from the selection branch before reaching the place branch), so it takes two taps to place the next icon.

I have not yet reproduced the "can't place at all" case on device, so the first step is to confirm which of these you are hitting before changing the tap logic.

## The fix

1. **Drag-to-pan the map.** Add pointer drag handling on the map wrapper, active whenever the mode toggle is set to Pan:
   - track the drag delta in pixels, translate the background image live so it follows the finger (no network round-trip mid-drag)
   - on release, convert the pixel delta into a lat/lng offset for the current zoom level and update `coords`, which refetches the static image at the new centre
   - drawn strokes and placed icons stay where they are relative to the canvas (they are annotation, not map-anchored), same as today after a zoom
2. **Add a "recentre on me" button** next to the zoom controls so it is always one tap back to the current location after panning.
3. **Make icon placement single-tap reliable:**
   - selecting a car/hazard pill always arms that icon (no silent "armed with nothing" state); tapping the already-active pill disarms back to the pen so state is never ambiguous
   - when an icon is selected and you tap empty map while a car/hazard tool is armed, deselect *and* place in the same tap
   - keep the existing drag-to-move and rotate/delete bar behaviour unchanged
4. **Make the mode toggle clearer** — label it "Draw / Move map" so it is obvious the second state is for moving the map.

## Technical notes

- Pan → lat/lng: metres per pixel at latitude L and zoom Z is `156543.03392 * cos(L * pi/180) / 2^Z`; convert the x/y pixel delta to degrees and subtract from the centre. The static image is requested at `scale: 2`, so halve device pixels before converting.
- Live drag uses a `transform` on the background layer via ref (no React re-render per move), reset to zero when the new centre image is applied.
- Pan drag is bound to the wrapper, not the canvas, and only runs in Pan mode; drawing behaviour in Draw mode is untouched.
- No changes to save, share, send-to-pupil, voice note, arrow/ruler/text tools, or undo.
