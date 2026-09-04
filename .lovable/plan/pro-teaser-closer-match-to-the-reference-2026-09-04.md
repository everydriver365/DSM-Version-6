# PRO teaser — closer match to the reference

Scope: `src/routes/pro-teaser.tsx` only. No changes to branding, header, nav, other pages, or `capacitor.config.ts`. Section order stays as it is now.

## What changes

**1. DIA hero**
- Large blue DIA shield badge (shield silhouette, not the square logo tile) at top-left, sized like the reference.
- Instructor photo bleeds from the right with a soft diagonal/curved mask; the "WORTH £125 PER YEAR" shield sits over the photo.
- Tighter type stack: INCLUDED pill, "DIA MEMBERSHIP" heading, blue "WORTH £125/YEAR" subline, short paragraph, blue tick list.

**2. Website card**
- Keep the existing mockup image and feature ticks.
- Green globe badge + "YOUR WEBSITE / FREE" moves beside the mockup on wider phones, stacked on narrow.
- Replace the pale "PRO GIVES YOU" strip with a solid green full-width "GET YOUR FREE WEBSITE →" button (routes to the same place the website CTA currently uses).

**3. PRO PERKS**
- Replace the 2x2 card grid with the reference's single strip: Perkbox gift icon + "PERKBOX / Thousands of discounts" on the left, then a horizontally scrollable row of brand tiles (Tesco, Costa, Sainsbury's, ASDA, Just Eat, Uber Eats) ending in a "+9000 MORE OFFERS" tile.
- Section header stays "PRO PERKS — Real savings on things you already buy."

**4. PRO MEDIA HUB**
- Four colour cards (navy Radio, red TV, purple Podcasts, teal News) in a 2x2 grid with equal heights, icon + title on one line, two-line description, and a decorative waveform strip along the bottom of Radio/Podcasts as in the reference.
- Existing Supabase-backed TV/News behaviour and live-radio launch are unchanged.

**5. Perkbox discounts strip**
- Slimmed to the reference's single row: heading "THOUSANDS OF DISCOUNTS WITH PERKBOX" over a horizontally scrollable logo row with the "+9000 MORE OFFERS" tile at the end (no boxed sub-tiles).

**6. Membership pricing**
- Replace the Monthly/Annual toggle with three side-by-side (horizontally scrollable on mobile) cards, matching the reference:
  - PRO — "MOST POPULAR" orange tab, £24.99/month, two-column tick list, orange JOIN PRO.
  - PRO ANNUAL — "BEST VALUE" amber tab, £199.99/year, "Everything in PRO, paid yearly", savings box ("Save £99.89 / That's only £16.67/month"), amber JOIN PRO ANNUAL, struck-through £299.88.
  - PRO+ — purple "BEST VALUE" tab, £39.99/month, "Everything in PRO, plus: Benenden Health", purple JOIN PRO+.
- All three buttons keep the current subscription navigation.

**7. Add-ons**
- Replaced by the reference's three low-key trust items in a row: SAVE MORE (piggy bank), PROTECTED (shield), STAY CONNECTED (people). The existing Multi Car / White Label add-on rows move underneath as a compact list so nothing is lost.

**8. Final CTA**
- Orange full-width bar, sparkle icon left, chevron right, "JOIN EVERYDRIVER PRO / From £24.99/month" — same action as now.

## Technical notes
- Pure presentational rewrite of the JSX/styles inside `pro-teaser.tsx`; data fetching, radio hook usage, and navigation handlers untouched.
- Brand logo tiles are text-styled (as today) unless real logo assets already exist in the project.
- Verify with a mobile-width Playwright screenshot pass and `bunx tsgo --noEmit`.
