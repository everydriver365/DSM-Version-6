## Plan: make the Next Lesson tile show weather, distance, drive time, and ETA

### What I found
- The Next Lesson tile is making both server-function calls, but both responses currently return `null`.
- The linked Google Maps connector itself works: direct gateway checks returned valid geocode, weather, and route data for the same postcode/route.
- That points to the app-side server-function implementation/response path, not the visual tile layout.

### Fix
1. **Keep the scope focused to the Next Lesson data path**
   - Update the existing weather and drive-time server functions so they return usable data instead of silently returning `null`.
   - Keep provider errors visible in logs so future failures show the real Google/gateway status.

2. **Harden Google gateway calls**
   - Use the confirmed connector gateway shape:
     - `https://connector-gateway.lovable.dev/google_maps/...`
     - `Authorization: Bearer LOVABLE_API_KEY`
     - `X-Connection-Api-Key: GOOGLE_MAPS_API_KEY`
   - Preserve the Routes API field mask for drive time/distance.
   - Keep weather using geocode → current conditions lookup.

3. **Fix the home tile fallback flow**
   - Ensure the `/home` effect retries correctly when `instructorHomePostcode` arrives after the first render.
   - Avoid caching a blank/null pair too early while one request is still unavailable or pending.
   - Keep the existing geolocation-first behavior, then fallback to instructor home postcode.

4. **Verify in preview**
   - Reload `/home` and confirm the Network panel server-function responses include real weather/route objects.
   - Confirm the tile cells no longer show blanks/`—` for Drive, Dist, Weather, and ETA when the lesson has a postcode/destination.