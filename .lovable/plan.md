# Plan: Make selected PRO Live station tile green

## Goal
Change the selected state of the radio station tiles (specifically the **PRO Live** tile) from app-blue to a subtle green, so it no longer looks like a generic selected UI element.

## Current state
- `src/routes/pro.tsx` contains a reusable `SquareTile` component used by PRO Radio stations, PRO TV sub-tiles, PRO Perks, etc.
- `SquareTile` hardcodes the selected state to primary blue (`#1877D6`) background, white text, and a blue shadow.
- The PRO Live station tile initializes as selected, so it renders with that blue styling.

## Changes
1. Add an optional `selectedColor` prop to `SquareTile` that overrides the default blue for the background, shadow, and text when `selected` is true.
2. Apply a subtle green (`#16A34A` or a slightly muted variant) to all PRO Radio station tiles by passing `selectedColor` in `STATION_TILES` or at the render site.
3. Leave all other SquareTile consumers (TV, Perks, What’s Happening, Shop) on the default blue so the change is scoped to the radio section.

## Verification
- Run `bunx tsgo --noEmit -p tsconfig.json` to confirm types.
- Capture a 390px preview screenshot of the PRO page radio section to confirm the selected PRO Live tile is now green.