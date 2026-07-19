## Add an interactive Google Map to the Next Lesson tile

Only touch `src/routes/home.tsx`.

### What we'll build
Replace the plain grey hero area with a real interactive Google Maps JS map showing the driving route from the instructor's current location (or home postcode fallback) to the pupil's pickup, rendered with the same route data we already fetch via `getLessonDriveTime`. Tapping the map opens the existing `directionsUrl` in Google Maps.

### Implementation

1. **Load Maps JS once.** Reuse the same script-loader pattern already used in `src/components/dsm/AddressLookup.tsx` (idempotent `<script>` inject with `SCRIPT_ID`), but include `loading=async` and no `libraries=places` (not needed here). Key comes from `import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`.

2. **New `NextLessonMap` sub-component** inside `home.tsx`:
   - Props: `originLat`, `originLng`, `destination` (string), `encodedPolyline` (optional — we already return `routes.polyline.encodedPolyline` from the server fn; expose it via `LessonDriveTime` type), `directionsUrl`.
   - On mount: ensure script loaded, create `google.maps.Map` on a ref'd div with `disableDefaultUI: true`, `gestureHandling: "none"`, `clickableIcons: false`, `keyboardShortcuts: false`, no `mapId`.
   - Add a green `google.maps.Marker` at origin and red at destination (geocode destination client-side via `Geocoder` if we don't have lat/lng — but we can also add `routes.legs.endLocation` to the server payload to skip geocoding).
   - Draw the route: decode `encodedPolyline` using `google.maps.geometry.encoding.decodePath` (requires `&libraries=geometry` in the script URL) and render as a `google.maps.Polyline` with `#1877D6`, weight 4.
   - Fit bounds to the polyline.
   - Wrap in a clickable div that `window.open(directionsUrl)` on tap.

3. **Expose polyline + endLocation from the server.** `LessonDriveTime` in `src/lib/lesson-drive-time.server.ts` already computes `staticMapUrl` from `route.polyline.encodedPolyline` and `leg.endLocation` — surface those two as fields on the returned object (`encodedPolyline`, `destLat`, `destLng`). This is a tiny additive change and required for the map. *(Exception to the "only home.tsx" scope — flagged here explicitly.)*

4. **Wire it into the hero.** In the next-lesson tile hero (currently the grey box with date pill), render `<NextLessonMap …/>` at 160px height when `driveData` is present; keep the existing grey placeholder as fallback while loading or when `driveData` is null.

5. **Keep the date pill + time caption overlays** on top of the map with a subtle gradient scrim for legibility (same gradient pattern already in the file).

### Files
- `src/routes/home.tsx` — add `NextLessonMap`, script loader, wire into hero.
- `src/lib/lesson-drive-time.server.ts` — add `encodedPolyline`, `destLat`, `destLng` to the returned object (additive only).

### Notes
- Uses the referrer-restricted browser key already in `.env` — safe to embed.
- No `mapId`, no `AdvancedMarkerElement` (per Google Maps knowledge).
- Static map URL stays as-is for fallback / other consumers.