# PRO Teaser Tile Layout Plan

## Goal
Make the **PRO Perks** and **PRO Media Hub** sections on the `pro-teaser` page sit inside a single rounded white tile/card, matching the existing DIA Membership and Free Website tile treatment.

## Current state
- `DIA Membership` and `Free Website` are each rendered as one rounded white card (`CARD` style) with the section heading, image/iconography, copy and CTAs all contained inside.
- `PRO Perks` has the `<SectionTitle>` heading outside the card; only the Perkbox + brand strip is inside the card.
- `PRO Media Hub` has its `<SectionTitle>` heading outside the card; the four media cards and PRO Shop button sit on the page background, not within a single tile.

## Plan
1. **PRO Perks tile**
   - Move the `<SectionTitle>` inside the existing `CARD` wrapper so the heading, subtitle, Perkbox promo and brand strip are all one continuous tile.
   - Keep the existing Perkbox button, horizontal brand scroll and "+9000" badge behaviour unchanged.
   - Adjust internal padding so the tile visually matches the DIA/Website tiles (same border-radius, shadow, outer padding from screen edges).

2. **PRO Media Hub tile**
   - Wrap the `SectionTitle`, the 2×2 `MediaCard` grid and the `PRO Shop` button in a single `CARD` container.
   - Preserve all existing click handlers: `PRO RADIO` play state, `PRO TV` video items, `PRO PODCASTS` / `PRO NEWS` media navigation, and `PRO SHOP` marketplace navigation.
   - Keep the internal 2-column grid layout and the full-width PRO Shop button inside the tile.

3. **Visual consistency**
   - Use the same `CARD` token, outer `padding`, and `borderRadius` as DIA/Website tiles.
   - Ensure no extra outer section padding conflicts with the tile's internal padding.

## Verification
- Run `bunx tsgo --noEmit` to confirm no type errors.
- Review the mobile preview to confirm both new tiles visually match DIA/Website tiles and the page order/behaviour is unchanged.
