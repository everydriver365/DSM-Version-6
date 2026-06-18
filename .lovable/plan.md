# Postcode autocomplete & geocoding for course pickup area

## Why
Today the pickup area field is only regex-checked. Fake-but-well-formed postcodes pass, and we store no coordinates — so the `radius_miles` field can't actually be used to match pupils to courses by distance. We should make the instructor pick a real, confirmed location.

## What the instructor will see
In both **Create course** (`src/routes/courses.new.tsx`) and **Edit course** (`src/routes/courses.$id.tsx`):

1. Pickup area input becomes a search box ("Enter postcode or town").
2. As they type (debounced ~300ms, min 3 chars), a dropdown shows up to 5 matching UK locations — e.g. `SO23 9AA — Winchester, UK`.
3. They tap a suggestion to confirm. The confirmed postcode + formatted address are shown as a "chip" with an X to clear and re-search.
4. Save is blocked until a suggestion has been confirmed (for `status = active`). Draft courses can still save without one.
5. Existing courses that already have a `pickup_area` string but no coordinates show as "Unverified — tap to confirm" so instructors can upgrade them.

## What we store
Add to `instructor_courses` (new migration):
- `pickup_postcode text` — normalised, e.g. `SO23 9AA`
- `pickup_formatted_address text` — human label shown to pupils
- `pickup_lat double precision`
- `pickup_lng double precision`
- `pickup_place_id text` — Google place id (for re-lookup)

Keep existing `pickup_area` for backward compatibility (mirror of postcode).

## Technical approach

**Google Maps Platform connector** (not yet linked to this project). I'll link it via `standard_connectors--connect` before writing code. Uses the existing managed key — no setup for the user.

**Browser autocomplete** — Places API (New) via `AutocompleteSuggestion.fetchAutocompleteSuggestions()`, restricted to UK (`includedRegionCodes: ['GB']`) and biased to postal codes/localities. Loaded with the browser key (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`) and a session token for billing efficiency.

**Server-side resolve on selection** — a new `resolvePickupLocation` server function (`src/lib/courses.functions.ts`) calls Places Details + Geocoding through the gateway to get the canonical postcode + lat/lng. This avoids trusting the client and avoids exposing geocoding via the browser key (which isn't authorised for it).

**Shared component** — `src/components/PickupAreaPicker.tsx` so both routes use the same UI/logic. Returns `{ postcode, formatted_address, lat, lng, place_id }` to the parent.

## Files

- New: `db/040_course_pickup_geocode.sql` — adds the columns + grants (no RLS change needed)
- New: `src/components/PickupAreaPicker.tsx`
- New: `src/lib/courses.functions.ts` — `resolvePickupLocation` server fn
- Edited: `src/routes/courses.new.tsx` — replace pickup input + save the new fields
- Edited: `src/routes/courses.$id.tsx` — same, plus migration banner for legacy rows
- Edited: `src/routes/__root.tsx` — load Maps JS API with `loading=async` + callback

## Out of scope (ask if you want them)
- Pupil-side "courses near me" filtering using the new lat/lng + `radius_miles`
- Backfilling coordinates for existing courses automatically
- Showing a small map preview under the confirmed chip

## Confirm before I build
1. OK to link the **Google Maps Platform** connector to this project?
2. Restrict suggestions to **UK only**, postal codes + towns? (vs. full addresses)
3. Block "active" courses without a confirmed location, but allow "draft" to skip? (recommended)
