Add three GPS filters to live.tsx handlePosition

## Goal
Filter noisy GPS points in `src/routes/live.tsx` so only accurate, useful positions are added to the route polyline and coordinate list.

## Scope
Only the `handlePosition` function in `src/routes/live.tsx` (around line 854) will be changed. Nothing else is modified.

## Changes
After `heading` is set and before the `Coord` point is created, insert three filters:

1. **Accuracy filter** — ignore points with GPS accuracy worse than 50 metres.
2. **Distance filter** — ignore points less than 5 metres from the previous point (stationary jitter).
3. **Speed sanity filter** — ignore points where speed jumps more than 40 mph in under 2 seconds.

## Verification
After the edit, read the start of `handlePosition` back to confirm the three filters appear in the exact order above and the rest of the function is unchanged.

## Deliverables
- Updated `src/routes/live.tsx` with the three filters applied to `handlePosition` only.
- A side-by-side before/after of the top of `handlePosition` for review.