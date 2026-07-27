## What's actually happening

Verified in your running preview:

- The next-lesson tile is showing the **fake placeholder** (the hand-drawn SVG curve with green/red dots), not a real map. No Google map container (`.gm-style`) exists in the page.
- The tile only renders the real map when `driveData` is non-null (`src/routes/home.tsx` ~line 4590).
- `driveData` is null because the drive-time server function returns null. Server log, captured just now:
  `[lesson-drive-time] missing LOVABLE_API_KEY or GOOGLE_MAPS_API_KEY`
- So it is **not** a Google/API problem: I called the Routes API through the connector gateway with your "Ken's Google Maps Platform" connection and it returned HTTP 200 with a valid route. The connection is linked, and both secrets exist at project level.
- The failure is that those two server-side secrets are not present in the preview/dev server runtime environment, so `process.env.LOVABLE_API_KEY` / `process.env.GOOGLE_MAPS_API_KEY` are undefined inside the handler and it bails out before calling Google.
- The lesson itself has a good destination ("2 The Lyndons, Passfield, Liphook, GU30 7SD"), geolocation permission is granted, so nothing upstream is at fault.

Net effect: on the published site (where the secrets are injected) the map likely works; in preview it always falls back to the fake SVG. Either way, the tile has a single point of failure — no drive time means no map at all.

## Plan

Only `src/routes/home.tsx` changes (plus an optional check of the published deployment).

1. **Verify published behaviour first.** Hit the drive-time function on the published deployment to confirm the secrets are injected there. If it also returns null, the fix is credential-side (re-link the Google Maps connection so the secrets propagate) and I'll report that rather than paper over it.

2. **Decouple the map from drive time.** In the next-lesson tile, render `NextLessonMap` whenever we have *any* usable coordinates or a destination address, not only when `driveData` exists:
   - If `driveData` exists → current behaviour (origin, destination, route polyline, traffic ETA).
   - If not, but we have the browser geolocation position and/or the pupil's address → render the map using the client-side Google Maps JS key (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`, already present and working in the browser), geocoding the destination client-side and dropping the two markers with a straight connector line. No route/ETA, but a real map.

3. **Only fall back to the illustration when there is genuinely nothing** (no destination and no location), and keep the existing "Loading map…" state while the map initialises so it never silently looks broken.

4. Leave all existing ETA / traffic / "More" behaviour untouched.

## Technical notes

- `NextLessonMap` already loads the Maps JS API with the browser key and handles markers/polyline/bounds — it just currently never mounts without `driveData`. The change is in the caller's condition plus passing coordinates from a client-side geocode instead of from the server response.
- Client-side geocoding will use the Maps JS `Geocoder` (allowed by the browser key on `*.lovable.app`), so no extra server round-trip.
