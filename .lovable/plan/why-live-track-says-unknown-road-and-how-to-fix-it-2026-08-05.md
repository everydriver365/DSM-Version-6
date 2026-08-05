# Why Live Track says "Unknown road" (and how to fix it)

## What's happening

The banner classifies roads into Motorway / A Road / B Road only. That classification (`src/routes/live.tsx`, lines 521-529) is derived from the TomTom route number (M/A/B prefix) or `roadUse` values. An ordinary residential or unclassified street has no route number and a `roadUse` like `LocalStreet`, so the type comes back `null` and the banner falls back to the grey "Unknown road" pill.

Two real problems make it worse:

1. **The street name disappears.** The second pill only renders when a route number (`roadTag`) exists (line 1548). On a named street with no number, the pill row shows just "Unknown road" and drops the actual road name entirely — even though the name was fetched successfully.
2. **Cached lookups never restore the road type.** The 24-hour cache read (lines 463-483) returns early after setting speed limit and road name, and never sets `roadType`. So after a cache hit, a genuine A road can display as "Unknown road".

## Fix

Only `src/routes/live.tsx`.

1. Add a "Local road" classification: when a street name was resolved but there is no motorway/A/B route number, set `roadType` to `"Local road"` instead of `null`, styled as the neutral grey pill. Keep "Unknown road" strictly for the case where nothing at all was resolved.
2. Always render the name pill when `roadLabel` exists, not only when `roadTag` exists, so named streets still show their name.
3. Persist and restore `road_type` in the speed-limit cache so cache hits keep the correct classification (falls back to re-deriving from the cached road name when the stored column is absent).

## Technical notes

- Classification block: `ensureSpeedLimit`, lines 521-529.
- Cache read early-return: lines 463-483; cache upsert: line 543 onwards.
- Pill rendering: lines 1513-1590.
- Colour mapping stays as is — Motorway blue `#1877D6`, A Road green `#1A9C56`, B Road white `#F8FAFC`, with grey for local/unknown.
