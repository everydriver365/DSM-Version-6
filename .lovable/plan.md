## Problem

On Add pupil, typing in the address field never surfaces suggestions. `src/components/dsm/AddressLookup.tsx` uses the **legacy** `google.maps.places.AutocompleteService`, which Google deprecated in March 2025. Newer Maps API keys — including the Lovable-managed browser key — refuse legacy Places calls (typically `REQUEST_DENIED` / `ApiNotActivatedMapError`), so predictions silently never arrive and the dropdown stays empty. Lovable's own Google Maps guidance explicitly says: don't use `AutocompleteService` / legacy `PlacesService` — use Places API (New) surfaces.

## Fix — migrate `AddressLookup.tsx` to Places API (New)

Only touch `src/components/dsm/AddressLookup.tsx`. All call sites (pupils.new, pupils.$id edit, admin.job-offers, etc.) keep working because the `AddressLookupResult` shape doesn't change.

1. **Script loader**: change the loader URL to load the modern Maps JS with `loading=async&v=weekly` (drop `libraries=places` from the URL; use `importLibrary` instead). Await `google.maps.importLibrary("places")` and cache the returned `AutocompleteSuggestion` + `AutocompleteSessionToken` + `Place` classes in refs.

2. **Predictions**: replace the `serviceRef.getPlacePredictions(...)` call inside the debounce effect with:
   ```ts
   const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
     input: inputValue,
     sessionToken,
     includedRegionCodes: ["gb"],
   });
   ```
   Map each `suggestion.placePrediction` to the existing internal `Prediction` shape (`place_id`, `description`, `structured_formatting`) so the render/JSX below stays identical.
   - Empty array → set `noResults` (same UX as today).
   - Thrown error → set the same `error` state (same red-text path).

3. **Details on select**: replace `placesServiceRef.getDetails(...)` in `handleSelect` with:
   ```ts
   const place = suggestion.placePrediction.toPlace();
   await place.fetchFields({ fields: ["formattedAddress", "addressComponents", "location"] });
   ```
   Then read `place.formattedAddress`, `place.addressComponents` (note: `componentType` / `longText` / `shortText` on the new API), and `place.location.lat() / .lng()`. Keep the exact same parsing loop (street_number, route, postal_town/locality, admin_area_level_2, postal_code) but read from the new field names. Downstream `onAddressFound(...)` call and all state setters stay unchanged.

4. **Session token**: create one `AutocompleteSessionToken` per lookup cycle (regenerate after each successful selection or `reset()`) — this is what Google bills as one session and what the new API expects.

5. **Cleanup**: remove the legacy typings (`GAutocompleteService`, `GPlacesService`, `placesServiceRef`, the hidden `<div>` PlacesService node). Keep the rest of the component (input, loading spinner, "Search now" button, suggestions dropdown, door number field, `splitLeadingDoor`, `reset`, `commitDoorNumber`) untouched.

## Out of scope

- No changes to `pupils.new.tsx`, `pupils.$id.tsx`, `admin.job-offers.tsx`, or any other caller.
- No change to the `AddressLookupResult` interface or the `onAddressFound` contract.
- No new dependencies; browser key env var stays the same.

## Verification

After the change, on Add pupil: type "10 Downi…" → dropdown lists Downing Street predictions → tap one → address, postcode, city, lat, lng populate and the confirmed state shows with the door-number field. Watch the console for `[address-lookup]` logs and confirm no `REQUEST_DENIED` errors from the Maps script.