# Redesign the PRO teaser page

Rebuild `/pro-teaser` as a mobile-first, light, premium membership page matching the reference composition. All work stays in `src/routes/pro-teaser.tsx` (plus asset pointer JSON files if a new image is needed). No other page, the global header, navigation or branding changes.

## Section order (fixed)

1. **DIA MEMBERSHIP** — the hero and the most prominent block. DIA shield logo, INCLUDED chip, "DIA MEMBERSHIP", "WORTH £125/YEAR", the one-line description, the five ticked benefits, and a navy/blue "WORTH £125 PER YEAR" badge sitting over the existing EveryDriver instructor photo treatment.
2. **YOUR WEBSITE — FREE** — desktop + mobile website mock-up image, five free-tier ticks (5-page professional website, EveryDriver web address, mobile friendly, contact & enquiry tools, showcase lessons and areas). No "auto-generated" wording anywhere. Below that a small tinted "PRO gives you" strip: up to 20 pages, your own custom domain. Deliberately lighter weight than DIA.
3. **PRO PERKS** — "Real savings on things you already buy." Four clean cards: Perkbox, HMCA Benefits, 20-page website & custom domain, PRO Shop.
4. **PRO MEDIA HUB** — "Industry news, advice and entertainment — made for driving instructors." Four colourful cards (Radio navy, TV red, Podcasts purple, News teal), with PRO Radio given extra prominence (larger/first, waveform treatment).
5. **PERKBOX DISCOUNTS** — compact strip: title, "Save on the brands you love, every day.", brand row (Tesco, Costa, Sainsbury's, ASDA, Just Eat, Uber Eats) with the short discount lines under each, ending in a "+9000 MORE OFFERS" tile.
6. **MEMBERSHIP PRICING** — see below.
7. **ADD-ONS** — small, low-key: Multi Car £2.99/month, White Label £19.99/month.
8. **FINAL CTA** — full-width orange "JOIN EVERYDRIVER PRO" with "From £24.99/month" underneath. The old "From £14.99/month" wording is removed everywhere.

## Pricing (Monthly / Annual toggle)

A single Monthly | Annual segmented switch above two cards:

- **PRO** — Monthly: £24.99/month, 12-month commitment, footnote "£24.99 per month for 12 months". Annual: £199.99/year, BEST VALUE badge, "Everything in PRO, paid yearly", "Save £99.89 — that's only £16.67/month", strike-through £299.88 → £199.99 per year.
- **PRO+** — Monthly: £39.99/month, 12-month commitment, "Everything in PRO, plus ♥ Benenden Health" with a concise Benenden benefit list. Annual: £299.99/year, BEST VALUE badge, "Save £179.89 — that's only £24.99/month", £479.88 → £299.99 per year.

The PRO card lists the full inclusion set (DIA membership worth £125/year, 20-page website, custom domain, PRO Radio/TV/Podcasts/News, Perkbox, HMCA, PRO Shop, exclusive PRO content). CTA labels switch with the toggle: JOIN PRO / JOIN PRO ANNUAL, JOIN PRO+ / JOIN PRO+ ANNUAL. No cheaper monthly PRO plan without DIA.

## Live content

Media stays wired to the current data, as today: the PRO Radio card keeps the existing radio context and can play a station preview, and PRO TV / PRO News cards populate from the existing Supabase queries (`howto_videos`, news) with the marketing copy as the fallback when no rows load. Perks/shop counts continue to come from the current queries where they already do. The layout never collapses when data is empty — cards render their static marketing copy.

## Button behaviour

Section cards keep navigating to the same in-app destinations they do today (`/radio`, media hub, `/marketplace`, perks). The JOIN buttons and the final CTA route to the existing subscription/upgrade screen used elsewhere in the app; no new payment flow is added.

## Technical notes

- Only `src/routes/pro-teaser.tsx` is rewritten. `capacitor.config.ts`, `__root.tsx`, home and every other route are untouched.
- Existing assets reused: `dia-logo`, `driving-school-website` / `marketing-website-mockup`, `perkbox-logo`, `hmca-logo`, `bennenden-logo`, `pro-logo`, and the existing instructor hero image. Brand wordmarks in the Perkbox strip are rendered as styled text where no logo asset exists.
- Existing exported component signature (`ProTeaserPage` with `onNavigate` / `onNavigateToMedia` props) is preserved so any embedding container keeps working.
- Styling: white background, navy `#0B2341`, blue `#1877D6`, orange accent, rounded cards, subtle shadows, Sora headings / Poppins body, single-column mobile-first with a max content width for wider screens.
