# Fix "Area name" autocomplete on Coverage Areas

## What I checked

- The area-name field in `src/routes/coverage-areas.tsx` uses the **legacy** Google Places widget (`google.maps.places.Autocomplete`), loaded by appending `maps/api/js?...&libraries=places`.
- `src/components/dsm/AddressLookup.tsx` (the address lookup used elsewhere, which does work) was moved to the **new** Places API (`importLibrary("places")` + `AutocompleteSuggestion`) and prefers the Lovable-managed Google Maps browser key, falling back to the old hardcoded key.
- Coverage Areas still uses only the old hardcoded key and the legacy widget.
- I could not open the editor sheet in the live preview to capture the exact browser error, so the precise failure (legacy Places disabled on the key vs. loader conflict) is **unconfirmed**. Either way, the page is on a deprecated path that the rest of the app has already left behind.

Two things make the field fail silently today:
1. If the script or the legacy widget doesn't initialise, `placesLoaded` stays false, so the input is left **disabled** showing "Loading…" — no error is ever shown.
2. Both files share the script id `google-maps-places-script` but load Maps with different parameters, so whichever loads first can leave the other's expected API surface missing.

## Plan

1. **Diagnose first**: open the Add/Edit area sheet in the preview and read the console/network response from the Maps script to confirm whether it's a legacy-API rejection or a loader conflict. Report what it says.
2. **Migrate the area-name field to the new Places API**, matching `AddressLookup.tsx`:
   - Use the shared bootstrap loader + `importLibrary("places")`.
   - Use `AutocompleteSuggestion.fetchAutocompleteSuggestions` with `includedRegionCodes: ["gb"]`, debounce ~300ms, and render suggestions in a custom dropdown inside the sheet (no `.pac-container`, which avoids z-index issues under the bottom sheet).
   - On select, call `toPlace().fetchFields(["displayName","formattedAddress","location"])` and set `areaName`, `lat`, `lng` exactly as today.
   - Use the Lovable-managed browser key with the existing key as fallback, same as `AddressLookup`.
3. **Never hard-block the field**: keep the input enabled even if Places fails; the instructor can type a name manually, and the centre still comes from the outcode lookup or auto-derive on save. Show a small inline "Address lookup unavailable" note instead of a permanently disabled "Loading…" input.

## Scope

Only `src/routes/coverage-areas.tsx`. No change to the outcode validation, radius field, map preview, save payload, or the auto-derive-outcode logic added previously.
