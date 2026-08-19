# Fix: Live Track stuck on "Acquiring GPS signal…"

Only `src/routes/live.tsx` changes.

## What I found in the code

The panel shows "Acquiring GPS signal…" whenever `coordinates.length === 0` (line 1877). Three things in the current code can keep that list empty forever:

1. **The first fix is thrown away.** `startTracking` calls `handlePosition(...)` for the one-shot `getCurrentPosition` at line 725, and only *after* that resets `coordsRef.current = []` and `setCoordinates([])` (lines 744-745). So the initial position is wiped immediately.
2. **The accuracy filter drops everything.** `handlePosition` returns early when `accuracy > 100` (line 898). In a desktop/laptop browser, and indoors on a phone, Wi‑Fi positioning routinely reports 500-3000 m accuracy, so every single point is rejected and no coordinate is ever added.
3. **The 5 m jitter filter blocks a stationary start.** Once a first point exists, any point under 5 m away is skipped (line 906) — sitting still means no further points, and any watch error is only logged, never shown, so the UI just sits there.

## Fix

1. Reset the tracking state (`coordsRef`, `coordinates`, distance, timers) **before** requesting the initial fix, so the one-shot position is kept and the panel switches to "Tracking" straight away.
2. Make the accuracy filter adaptive instead of a hard 100 m cut:
   - always accept the first point of a journey regardless of accuracy;
   - after that, skip a point only if its accuracy is worse than 100 m **and** we already have a recent good point — so a temporarily poor fix doesn't stall the whole session.
3. Surface what's actually happening instead of a permanent "Acquiring":
   - keep a `lastFixAccuracy` / `lastGeoError` state updated from the watch callback and the skip branches;
   - when still waiting, show the reason under the status line ("Weak signal — 850 m accuracy" / the watch error message) rather than an unchanging spinner text.
4. Show watch errors: the `watchPosition` error branch (line 809) sets `geoError` and shows a toast the first time, instead of only `console.error`.
5. Raise the watch `timeout` from 10 s to 30 s to match the one-shot call, so a slow first native fix doesn't error out.

## Untouched

Road/speed-limit lookup, snap-to-roads, marker drawing, overspeed logic, saving, and the header/layout all stay as they are.

## Verify

In the browser preview, starting a manual journey should move off "Acquiring GPS signal…" as soon as the first position arrives, even with poor Wi‑Fi accuracy. On the installed iOS app the same, and if location is denied or the fix fails, the panel says why instead of hanging.
