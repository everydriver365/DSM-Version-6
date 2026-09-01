# Perk tiles: show real hero images

## Goal
Make the 2x2 PRO Perks grid show actual perk photography instead of coloured gradient blocks.

## Approach
Prefer perks that already have a hero image in Supabase. No new artwork, no schema changes.

1. Fetch a larger pool of perks (e.g. 12 instead of 4) from `benefit_perks`.
2. Order the pool so perks with a non-empty `hero_image_url` come first, keeping the existing order within each group.
3. Render the top four from that ordered list in the existing 2x2 grid.
4. Keep the current gradient + initial fallback for any tile where no image is available.
5. Add graceful handling if an image fails to load (fall back to the gradient tile) so no broken-image icons appear.

Everything else stays the same: tile size, radius, saving chip, title/category text, navigation to `/perks/{id}`, and the "See all perks" link.

## Technical notes
- Only `src/routes/pro.tsx` changes.
- The perks query already selects `hero_image_url`; only the limit and ordering logic change.
- `capacitor.config.ts` and all other routes untouched.
