# Fix: PRO Perks section shows nothing

## What's actually wrong

The perks data is there — 10+ active perks exist (24/7 private GP access, Mental health counselling, Cinema tickets, etc.). The problem is the query the PRO page runs fails outright.

The PRO page asks for each perk plus its partner's `logo_url` and branding. The database returns:

```text
column benefit_partners_1.logo_url does not exist
```

The migration that adds `logo_url` / `hero_image_url` to the partners table (`db/057_benefit_partner_images.sql`) was written but never applied to the live database. Because the whole request errors, no perks come back, and the carousel hides the section — exactly what you're seeing.

Second, smaller issue: no partner rows are readable publicly (the partners list comes back empty), so partner names/logos would be blank even after the column fix.

## The fix

1. Apply the missing columns to `benefit_partners` (`logo_url`, `hero_image_url`) so the existing query resolves.
2. Make the PRO perks query resilient: request only partner fields that exist, and if the partner join fails, still render the perks (name, saving, description, category, hero image, gift-icon fallback). A missing partner should never blank out the whole section.
3. Check why partner rows aren't publicly readable (likely `active = false` on the partner records) and report back; the perks themselves render fine without them.

## Technical notes

- Run the contents of `db/057_benefit_partner_images.sql` against the live database (idempotent `add column if not exists`).
- In `src/routes/pro.tsx`, the perks fetch inside the `Promise.allSettled` block: keep the embedded `partner:benefit_partners(...)` select limited to `name, logo_url, icon_bg, icon_color`, and add a fallback second query without the embed if the first errors, so a schema drift like this degrades instead of hiding the section.
- No other PRO sections, styling, or the carousel behaviour change.
