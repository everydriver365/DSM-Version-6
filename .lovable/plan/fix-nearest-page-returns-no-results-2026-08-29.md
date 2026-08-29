# Fix: Nearest page returns no results

## What's wrong

Nearby search has two possible routes to Google Places:

1. The Lovable Google Maps connector gateway (working — I tested it live and it returned real places for Southampton).
2. A direct call using a `GOOGLE_API_KEY` environment value.

The code prefers route 2 whenever `GOOGLE_API_KEY` exists. That key is present in this project but is not a Places API (New) key — the direct call comes back `404`, which the code turns into the generic "Could not search nearby places right now." message you see on screen. So the working path is never tried.

## The fix

In `src/lib/nearest.server.ts` (`searchNearbyPlaces`):

- Prefer the connector gateway whenever both `LOVABLE_API_KEY` and `GOOGLE_MAPS_API_KEY` are available; only fall back to the direct `GOOGLE_API_KEY` path when the gateway credentials are missing.
- Add a safety net: if the chosen path fails with 404/403, retry once via the other path before returning an error.
- Log the failing status and response body (already partly done) so future failures name the real cause instead of the generic message.

No changes to `src/routes/nearest.tsx`, the map, the category pills, or any other file.

## Verification

After the change, call the search for a fuel/toilets category at the same coordinates and confirm real places render in the list.
