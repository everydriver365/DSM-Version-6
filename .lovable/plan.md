## Diagnosis (unconfirmed — needs a console log check to fully confirm)

`src/components/dsm/AddressLookup.tsx` loads Google Maps with a hardcoded key:

```
const GOOGLE_MAPS_KEY = "AIzaSyDWFw0oL9ZyhwdvdvYtDsdJrTFYzF0khFc";
```

The same hardcoded key is duplicated in `pupils.$id.tsx`, `pupils.new.tsx`, `coverage-areas.tsx`, and `live.tsx`. Meanwhile `home.tsx` already uses the managed browser key `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` (referrer-restricted to `*.lovable.app` / `*.lovableproject.com`, safe for browser use).

The most likely cause of "no suggestions" is that the hardcoded key is HTTP-referrer restricted to a domain that no longer includes the current preview / published origin, so Places `getPlacePredictions` returns `REQUEST_DENIED` and the dropdown stays empty. The component already logs `"[address-lookup] getPlacePredictions failed:"` with the status on failure — I'll ask you to confirm the status string after the fix if it still misbehaves.

## Fix

Switch `AddressLookup` to the managed browser key, with a safe fallback to the old key so nothing regresses if the env var is missing at build time. This is a one-file change and does not touch any other Google Maps usages in the app.

### File: `src/components/dsm/AddressLookup.tsx`

- Replace the hardcoded `GOOGLE_MAPS_KEY` constant with:
  ```ts
  const GOOGLE_MAPS_KEY =
    (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined)
    || "AIzaSyDWFw0oL9ZyhwdvdvYtDsdJrTFYzF0khFc";
  ```
- Keep everything else (script loader, `AutocompleteService`, `getDetails`, UI, error messaging) unchanged.

### Verification

- After the change, open a pupil's Edit sheet and type a UK postcode (e.g. `SW1A 1AA`) — suggestions should appear within ~300ms.
- If no suggestions still appear, open the browser console and share the `[address-lookup] getPlacePredictions failed:` status; that string names the exact Google-side reason (e.g. `REQUEST_DENIED`, `INVALID_REQUEST`, `OVER_QUERY_LIMIT`) and dictates the next fix.

### Explicitly out of scope

- Not migrating from legacy `AutocompleteService` → Places API (New) `AutocompleteSuggestion` (larger refactor; only needed if legacy stops working).
- Not touching `pupils.$id.tsx`, `pupils.new.tsx`, `live.tsx`, `coverage-areas.tsx`, or `home.tsx`. Those other maps surfaces render maps, not autocomplete, so they aren't part of this bug — if they're also failing, we'll do a separate pass.
