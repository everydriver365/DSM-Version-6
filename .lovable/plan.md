# Bring the PRO page in line with the mock-up

A 390px capture of the current `/pro` page shows why it doesn't read like the reference. Confirmed from that capture:

- Only three sections render: PRO header, PERKS, PRO RADIO, PODCASTS.
- FEATURED, PRO TV and PRO SHOP render nothing at all — the `howto_videos` and `marketplace_listings` queries returned no usable rows in the preview session, so those sections self-hide.
- Perk cards show grey gift placeholders, not imagery — the loaded perks have no `hero_image_url`.
- Perk cards are 208px wide, so only ~1.8 cards fit on screen; the mock shows four compact cards with a peek.
- Perk badge text is long ("WORTH £50+ PER VISIT") and wraps the card layout away from the mock's short "20% OFF" chip.
- Perk titles clip mid-word ("Mental health…").
- Section headers use a single small uppercase eyebrow; the mock uses a blue PERKS eyebrow above a large navy sentence, and a bold "PRO TV" title with grey subtitle.

## What I'll do

**1. Find out why Featured / PRO TV / PRO Shop are empty**

This is the biggest visual gap and the cause is not yet confirmed. First step is to check whether `howto_videos` (published rows) and `marketplace_listings` (active rows) return data for a signed-in user in the preview, and whether the failure is empty data or a blocked read. The fix follows the answer:

- If rows exist but the read is blocked, correct the query/policy path.
- If rows genuinely don't exist, the sections stay data-driven but render a proper labelled empty state rather than vanishing, so the page keeps the mock's structure.

**2. Perks rail matched to the mock**

- Card width reduced to ~148px so roughly four cards and a peek are visible.
- Image area on top; when a perk has no `hero_image_url`, fall back to the partner logo, then to a branded navy/blue tile with the partner initial — no grey gift placeholder.
- The saving chip shows a short form: keep values like "20% OFF" as-is, shorten long ones (e.g. "WORTH £50+ PER VISIT" → "£50+ VALUE"), default to "EXCLUSIVE".
- Two-line titles, one-line grey subtitle, no mid-word clipping.
- Small dot indicators under the rail, as in the mock.

**3. Section headers matched to the mock**

- Blue uppercase eyebrow, large navy heading below it, grey supporting line where the mock has one, right-aligned blue "See all ›".
- Applies consistently to PERKS, FEATURED, PRO TV, PRO RADIO, PODCASTS, PRO SHOP.

**4. Featured, PRO TV, Podcasts, Shop rails**

- Featured hero: full-bleed image with the navy gradient panel, FEATURED badge, headline, two-line description, play row and duration chip bottom-right.
- PRO TV / Podcasts / Shop cards resized to the mock's compact scale (~135–150px) so three-plus cards are visible at once, with the coloured category label under the thumbnail.

## Scope

- Only `src/routes/pro.tsx` changes, plus read-only checks against the existing Supabase tables.
- No new tables, no mock content, no hardcoded perks; all sections stay wired to the current data and routes (`/perks`, `/perks/:id`, `/radio`, `/marketplace`, the existing media/TV destination).
- Global navigation, Home and `capacitor.config.ts` untouched.
