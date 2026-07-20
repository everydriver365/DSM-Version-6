## Diagnosis

Only touch `src/components/dsm/AddressLookup.tsx`.

Two likely reasons the address lookup "does not find" addresses:

1. **`types: ["address"]` filter is too strict.** UK users almost always start with a postcode (e.g. `SW1A 1AA`) or a place name. Google's Places Autocomplete treats a bare postcode as a `postal_code` / `geocode`, not an `address`, so the request returns `ZERO_RESULTS` and the UI shows "No results found." Removing the `types` restriction (or switching to `["geocode"]`) lets postcodes, streets, and full addresses all match.

2. **All non-`OK` statuses are silently swallowed as "no results."** The current callback only branches on `ZERO_RESULTS`; a `REQUEST_DENIED` (key/referrer/Places API disabled), `OVER_QUERY_LIMIT`, or `INVALID_REQUEST` also renders as "No results found. Try a different address." — so the user can't tell the API is actually failing. The console already shows a deprecation warning for the legacy Autocomplete surface, which hints the key/API path may be misconfigured.

## Fix

In `src/components/dsm/AddressLookup.tsx`, in the predictions `useEffect` around lines 200–221:

1. Drop `types: ["address"]` from the `getPlacePredictions` request so postcodes and place names also match. Keep `componentRestrictions: { country: "gb" }`.
2. Branch explicitly on `status`:
   - `OK` with predictions → show suggestions.
   - `ZERO_RESULTS` → show the existing "No results found" empty state.
   - Anything else (`REQUEST_DENIED`, `OVER_QUERY_LIMIT`, `INVALID_REQUEST`, `UNKNOWN_ERROR`, …) → set `error` to a short human message that includes the status (e.g. `"Address lookup failed (REQUEST_DENIED). Check API key or try again."`), clear suggestions, and hide the dropdown so the existing red error text under the input surfaces the real problem.
   - `console.error` the status + input so we can see it in logs.
3. Same treatment in `handleSelect`'s `getDetails` callback: surface the actual status in the error message instead of a generic "Could not fetch address details."

No other files change. No behavioural change to focus, debouncing, confirmed-state UI, or the `onAddressFound` payload.

## Follow-up if the fix reveals `REQUEST_DENIED`

If, after this fix, the input shows `REQUEST_DENIED`, the hardcoded key in `AddressLookup.tsx` (line 12) is the problem — either Places API isn't enabled on that key, or its HTTP-referrer allowlist doesn't include the current preview/published domain. That's a Google Cloud Console fix on the key itself, not a code change; I'll flag it once we see the status.
