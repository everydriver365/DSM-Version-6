# Why perk tiles show gradients instead of photos

## What the code does today

The PRO page tiles already read `benefit_perks.hero_image_url` and render a real `<img>` whenever that value is non-empty (`src/routes/pro.tsx`). Perks with images are even sorted to the front. So the rendering path is fine — the tiles fall back to the coloured gradient + initial only when the field is empty.

## Most likely cause (needs one confirmation step)

Nothing in the app ever writes a perk image. The admin Benefits editor (`src/routes/admin.benefits.tsx`) has no image or upload field at all, and the perks list page (`src/routes/perks.tsx`) never selects an image column either. The `hero_image_url` column on `benefit_perks` and the `logo_url` / `hero_image_url` columns on `benefit_partners` can currently only be filled by hand in SQL.

I could not query the database from plan mode, so step 1 below confirms whether the rows are actually empty before anything else changes.

## Plan

1. Confirm the data: check how many active perks have a non-empty `hero_image_url`, and how many of their partners have `logo_url` / `hero_image_url` set.
2. Widen the image fallback on the PRO page: use the perk's own hero image, then the partner's hero image, then the partner's logo, then the existing gradient + initial. This requires adding `logo_url, hero_image_url` to the partner join in the perks query.
3. Apply the same fallback on the perks list page and the perk detail page so imagery is consistent everywhere.
4. Add image fields to the admin Benefits editor so perks and partners can get artwork without SQL: an image URL input (plus upload to the existing public `marketplace-images` bucket under `benefits/`) on both the perk form and the partner form.

If step 1 shows the rows do have images and they still are not rendering, the plan changes to a loading/URL problem instead (bad bucket path or non-public URL) and I will fix that instead of steps 2 to 4.

## Technical notes

- Files touched: `src/routes/pro.tsx`, `src/routes/perks.tsx`, `src/routes/perks_.$perkId.tsx`, `src/routes/admin.benefits.tsx`.
- No schema changes — `benefit_perks.hero_image_url` and the partner image columns already exist (db/055, db/057).
- Existing tile size, radius, chips, copy and navigation stay exactly as they are.
- `capacitor.config.ts` untouched.
