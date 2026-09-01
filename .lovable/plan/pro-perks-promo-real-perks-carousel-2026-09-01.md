# PRO Perks promo: real perks carousel

Right now the promo card fetches only the first active perk (`limit 1`) from `benefit_perks`, and if that fetch returns nothing it shows a hard-coded "AA Breakdown Cover" placeholder. The Fuel / Health / SIM labels come from that single row, so they're effectively static.

## What changes

**Featured card becomes a rotating carousel**
- Fetch the top active perks (up to 8) instead of one.
- The promo card swipes horizontally between them and auto-advances every ~6 seconds, pausing while the user is touching it.
- Small dot indicators under the card show position.
- Each slide keeps the current premium look: gradient background, PRO PERKS eyebrow, perk name, offer with the percentage highlighted, real perk image on the right, Claim CTA.
- Every field stays live from Supabase (name, saving, description, category, hero image, partner name). Gift-icon fallback stays for perks with no image.
- The fake "AA Breakdown Cover" placeholder is removed; if no perks load, the whole section is hidden.

**Category bar uses real categories**
- Pull distinct categories from all active perks, keep the white rounded bar with icons and dividers.
- Show the first three categories plus a "More" item, and "See all" on the right.
- Tapping a category opens `/perks` filtered to that category; "More" and "See all" open `/perks` unfiltered.
- Icons map by category name (fuel, health, phone/SIM, insurance, etc.) with a sensible default icon for anything unmapped.

## Technical notes

- Only `src/routes/pro.tsx` changes.
- Perk query: `benefit_perks` select `id, name, saving, description, category, hero_image_url, partner:benefit_partners(name, logo_url)` where `active = true`, ordered by `sort_order`, limit 8.
- `PerksCard` takes `perks: FeaturedPerk[]` instead of a single perk; carousel state is local (index + touch handlers, CSS transform track).
- Categories derived from the same result set, sentence-cased and de-duplicated.
- Category navigation uses `/perks?category=<slug>`; no other page or section is touched.
