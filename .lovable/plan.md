# Speed up icon placement on Map Draw

Placing a car/hazard icon on the Map Draw page feels laggy. The fix is scoped to `src/routes/pro-teach_.map.tsx` only.

## What's causing the delay

Confirmed by reading the file:

1. **Undo history keeps full-resolution bitmaps in React state.** `pushUndoSnapshot` stores `ctx.getImageData(...)` of the whole retina canvas into the `strokes` state array. On a 390x500 canvas at 2x DPR that's roughly 3 MB per snapshot, and they accumulate. Every subsequent state update (including adding an icon) has to churn through that memory, so React updates get progressively slower the longer the session runs.
2. **Every icon placement re-renders the entire page component.** The whole 1600-line route — toolbar strip, map image, style objects rebuilt inline each render — re-renders on each `setPlacedIcons`, instead of just the small overlay layer.
3. **Touch placement waits for the browser's default handling.** The canvas touch handlers don't suppress default gesture behaviour on placement, so the first tap can be delayed by the browser's touch/scroll disambiguation.
4. **A toast fires on the first placement**, which mounts extra UI in the same frame as the placement update.

Separately, while reading the code I noticed `getPos` returns device-pixel coordinates while the icon overlay positions its `<div>`s using those numbers as CSS pixels — on a 2x screen icons will land offset from the tap. Worth fixing in the same pass.

## The fix

1. Cap and lighten undo history: keep snapshots in a `useRef` (not state) and limit to the last ~10 entries, releasing older ones. Undo availability becomes a small counter in state instead of the bitmap array.
2. Split the placed-icon overlay (icons + selection ring) into its own memoised child component so placement only re-renders that layer.
3. Place the icon immediately on `touchstart` with default behaviour suppressed on the canvas, so there's no browser-imposed delay.
4. Drop the toast from the placement path (or show it once, deferred, after the icon renders).
5. Convert tap coordinates to CSS pixels for the overlay so icons appear exactly under the finger.

## Technical notes

- Only file touched: `src/routes/pro-teach_.map.tsx`.
- Store icon coordinates in CSS pixels; multiply by DPR only when drawing onto the canvas in `drawIconsOntoCanvas` / composite export, and in `findIconAt` hit-testing.
- No behaviour changes to drawing, ruler, arrow, text tools, or the save/share flows.
