# Inline "Find nearby" results inside DSM

Replace the current behaviour (tap a category → immediately opens Google Maps in a new tab) with an in-app results list. The sheet stays open, shows the nearest 10 places for the chosen category, and only opens Google Maps when the user taps a specific place for directions.

## Current behaviour (verified)

`src/routes/home.tsx` lines 7162-7238 render the `nearbyOpen` sheet: six emoji category buttons, each with a Google Maps search term. Tapping one requests geolocation, closes the sheet, and opens `google.com/maps/search/<term>/@lat,lng,15z` in a new tab. Existing state: `nearbyOpen`, `nearbyLoading` (lines 1441-1442).

## What changes

New state alongside the existing two: `nearbyResults`, `nearbyCategory`, `nearbyError`.

Categories keep the same six emoji/labels and gain a place type plus optional keyword:
Toilets, EV Chargers, Coffee, Parking, Food, Fuel.

Tapping a category:
1. Marks that category as loading, sets it as the active category, clears prior results/errors.
2. Reads the current position from the browser.
3. Runs a nearby place search within a 2 km radius and keeps the first 10 results.
4. On failure or no matches, shows "No {category} found within 2km".

The sheet then swaps the category grid for a results view:
- Header: back arrow (clears category + results, returning to the grid) and "{emoji} {Category}" title.
- Each row: place name (13px/600 #0B1F3A, one line), address below (11px #6B7686, one line), and on the right the rating (if any), distance from the current position, and a chevron. Rows have 12px/14px padding with dividers.
- Tapping a row opens Google Maps directions to that place's coordinates in a new tab.
- Loading shows a spinner with "Finding {category} nearby…"; the Close button stays available.

## Technical notes

- Two things sit just outside the requested line range and are required for the feature to work at all:
  1. The shared loader at line 251 requests `libraries=geometry` only. Place search needs the `places` library, so that URL must become `libraries=geometry,places`. This is a one-token change to a line shared with the Next Lesson map (which keeps working, since `geometry` stays).
  2. The loader's readiness checks poll for `google.maps.geometry`; that remains valid.
- The spec names `google.maps.places.PlacesService.nearbySearch`. That class is Google's legacy Places surface and is deprecated for new usage; Google's current browser API is `google.maps.places.Place.searchNearby()`. Recommendation: use `Place.searchNearby()` with the same 2 km radius, included types, and a 10-result cap, mapping each result's `displayName`, `formattedAddress`, `rating`, and `location`. It returns the same data with no behaviour difference for the user. If you prefer the exact call in the spec, say so and the plan will use `PlacesService` instead.
- Distance is computed from the browser position to each result using `google.maps.geometry.spherical.computeDistanceBetween`, shown as metres under 1 km and one-decimal km above.
- No other files, no backend, no database changes.

## Acceptance

- Tapping "Coffee" keeps the sheet open, shows a spinner, then lists up to 10 nearby cafés with name, address, rating and distance.
- Back arrow returns to the six-category grid.
- Tapping a result opens Google Maps directions to that place.
- Denied location or zero results shows the grey "No {category} found within 2km" message.
