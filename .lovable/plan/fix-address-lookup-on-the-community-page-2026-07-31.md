# Fix address lookup on the Community page

## What's wrong

The console shows the real cause:

```text
establishment cannot be mixed with other types.
```

In `src/routes/community.tsx` the address box is configured with
`types: ["route", "establishment"]`. Google rejects that combination, so every
keystroke returns an error and no suggestions ever appear. The script itself
loads fine — it's the request that's rejected.

A second, related risk: the "detect my location" step calls the Geocoding REST
API directly with the browser key. That key is only authorised for Maps
JavaScript and Places, so geocoding can come back `REQUEST_DENIED` and silently
leave the road/town fields blank.

## The fix

1. Use a single valid type for the suggestion list (`["route"]`, or drop `types`
   entirely to allow addresses and places). This alone restores suggestions.
2. Move off the deprecated legacy `google.maps.places.Autocomplete` to the
   current Places API surface (`AutocompleteSuggestion.fetchAutocompleteSuggestions`),
   rendering suggestions in a small dropdown under the road input, still
   restricted to Great Britain, with debounced input and a session token.
3. Selecting a suggestion fills both the road name and the town/area fields as
   it does today.
4. Route the reverse-geocode lookup through the server-side Google Maps gateway
   instead of the browser key, so "use my location" reliably returns a road and
   town. Errors surface as a short inline message rather than failing silently.

## Technical notes

- Files touched: `src/routes/community.tsx`, plus one small server function file
  for the gateway-backed reverse geocode (e.g. `src/lib/geocode.functions.ts`).
- Script loading (`loadGoogleMaps`, `libraries=geometry,places&loading=async`)
  stays as is.
- If you'd rather keep this to a one-line change, step 1 alone fixes the
  reported symptom; steps 2-4 remove the deprecation and the silent
  location-detection failure.
