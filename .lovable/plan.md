Confirm the motorway banner design applies to all motorways

## Goal
Ensure the live-track banner shown for the M27 in the approved mockup is used for every motorway, not just the M27.

## What we will do
1. Verify `src/routes/live.tsx` uses the motorway treatment whenever `roadType === "Motorway"` (not hardcoded to M27).
2. Check that the road-name parsing extracts the route number and street name for any motorway route number (e.g. M1, M25, M62, M275).
3. Confirm the blue motorway glyph, white road-name text, and left-justified layout render identically for any motorway.

## Out of scope
No changes to A-road, B-road, local road, or unknown-road rendering.

## Deliverables
- Confirmation that the motorway banner is generic.
- A screenshot/mockup of one additional motorway (e.g. M1) if useful for verification.