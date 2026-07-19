# Fix "no data on next-lesson tile"

The four stats (Drive, Dist, Weather, ETA) are blank because both server-side fetches are failing silently:

1. **Weather** — `getLessonWeather` returned `null` for `po2 0dh`. It calls `weather.googleapis.com` directly using `process.env.GOOGLE_API_KEY`. The most likely causes: (a) the Weather API product isn't enabled on the Google Cloud project behind that key, or (b) `GOOGLE_API_KEY` isn't set in this project's runtime secrets (the app should use the Lovable-managed Google Maps Platform connector instead).
2. **Drive/ETA/Dist** — `getLessonDriveTime` was never called. The code only fires it when `navigator.geolocation.getCurrentPosition` succeeds; if the browser permission is denied/dismissed/errored, drive data stays `null` forever with no user feedback.

## Fix

### 1. Route Google calls through the managed Google Maps connector (both server fns)
Files: `src/lib/lesson-weather.functions.ts`, `src/lib/lesson-drive-time.functions.ts`

Replace direct `https://weather.googleapis.com/...?key=GOOGLE_API_KEY` and `https://maps.googleapis.com/...?key=GOOGLE_API_KEY` calls with the connector gateway (`https://connector-gateway.lovable.dev/google_maps/...`) using `LOVABLE_API_KEY` + `GOOGLE_MAPS_API_KEY` headers. This:
- Removes the manual `GOOGLE_API_KEY` secret dependency.
- Uses Lovable's pre-enabled Weather/Geocoding/Routes APIs.
- Also swap the legacy Directions API for **Routes API** (`routes/directions/v2:computeRoutes`) — the connector's Directions API is deprecated and will fail.
- Swap the geocoding call in `lesson-weather.functions.ts` similarly (still allowed on the default host).
- Log server-side status + body when the gateway returns non-OK, so future debugging shows the real provider error instead of a silent `null`.

Requires linking the `google_maps` connector via `standard_connectors--connect` if not already linked.

### 2. Home-postcode fallback for drive time
File: `src/routes/home.tsx` (the chip-effect around lines 3186-3210)

Currently drive time only fetches if `navigator.geolocation.getCurrentPosition` resolves. Change to:
- Try geolocation first (as today).
- If it errors OR is unavailable OR times out (e.g. after 4 s), fall back to geocoding the instructor's `home_postcode` (already fetched in this file at line 2051 and available via state) and use that as the origin.
- Log the geolocation error object so we can see which case fired.

This makes the ETA/Drive/Dist columns populate even when the user hasn't granted location — critical on iOS PWA and preview environments.

### 3. Verify
After the fix:
- Reload `/home`, check console for `[home] weather result:` (should be a real `{tempC, condition}` object) and `[home] drive time result:` (should be a real `{durationMinutes, distanceText, ...}` object).
- Confirm the four stat cells fill in.
- If geolocation is denied, confirm the fallback path fires and drive data still populates.

## Out of scope
- No changes to the tile's visual layout, "Notify late" flow, community-alerts row, or map hero.
- No changes to `home.tsx` other than the geolocation fallback block.

## Technical notes
- The Google Maps Platform connector docs specify: Weather → `weather/` prefix, Routes → `routes/` prefix, Geocoding → default host (no prefix). The Routes API is a POST with a JSON body and requires `X-Goog-FieldMask` (e.g. `routes.duration,routes.distanceMeters,routes.polyline,routes.legs`) — different shape than legacy Directions, so `getLessonDriveTime`'s response parsing needs corresponding updates (fields like `duration` come as `"1234s"` strings, `distanceMeters` is numeric, `polyline.encodedPolyline` replaces `overview_polyline.points`).
- Static map URLs can still be built against the legacy `maps/api/staticmap` endpoint through the gateway default host; the polyline field just comes from the Routes response.
- The in-worker `CACHE` maps in both server fns can stay as-is.