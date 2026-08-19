# Road-snapped route line on Live Track

Only `src/routes/live.tsx` changes, and only the route line drawing / coordinate handling.

## Current code (lines 890-896)

```tsx
const google = (window as any).google;
if (google && mapInstanceRef.current) {
  const ll = { lat, lng };
  if (polylineRef.current) {
    const path = polylineRef.current.getPath();
    path.push(new google.maps.LatLng(lat, lng));
  }
```

Raw GPS points are pushed straight onto the polyline (`geodesic: true`), so the red line cuts corners like a crow-flies path.

## What changes

1. Add a `snapToRoads(points)` helper that POSTs the collected coordinates to TomTom's snap-to-roads endpoint using the existing `TOMTOM_API_KEY` constant, and returns road-following coordinates.
2. In `handlePosition`, replace the single `path.push(...)` with:
   - Every 5th point (and while under 5 points): call `snapToRoads` with all coords from `coordsRef.current` and `setPath` the polyline to the snapped result.
   - Between snaps: push the raw point as before, so the line still moves in real time.
3. Silent fallback: any non-OK response, empty result, or thrown error returns the raw coordinates, so the live line never breaks or disappears.

## Technical notes

- `handlePosition` becomes `async` (fire-and-forget from the watch callback); the marker, distance, speed, and state updates stay in their current order and remain synchronous.
- Snap responses are mapped tolerantly (`lat`/`latitude`, `lon`/`lng`/`longitude`) since TomTom field naming varies.
- Snapping every 5 points keeps API usage bounded.

## Untouched

Speed limit detection, road name detection, marker position/rotation, overspeed logic, saving, and all other live tracking behaviour.
