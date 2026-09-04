# Move Perkbox discount strip into PRO PERKS tile

## Goal
Relocate the standalone "THOUSANDS OF DISCOUNTS WITH PERKBOX" heading and horizontal brand-name strip so it lives inside the existing white PRO PERKS card, below the current PERKBOX mini-card and small brand cards.

## Scope
- Only edit `src/routes/pro-teaser.tsx`.
- Do not change page order, other sections, pricing, navigation, branding, or live Supabase-backed content.

## Changes
1. **Keep the existing PRO PERKS tile content** — `SectionTitle`, PERKBOX icon tile, and horizontal scrollable mini-brand cards remain exactly as they are.
2. **Move the standalone Perkbox section into the card** — cut the markup currently rendered as its own section (Perkbox logo + heading + horizontal brand-name strip + "+9000 MORE OFFERS" box) and place it at the bottom of the same white `CARD` wrapper, after the existing mini-brand cards.
3. **Remove the redundant outer section wrapper** so the strip no longer appears as a separate page section.
4. **Tidy spacing** — remove the outer section/padding that is no longer needed and ensure internal margins look consistent inside the card.

## Verification
- Run `bunx tsgo --noEmit` to confirm no type errors.
- Check the mobile preview: PRO PERKS card now contains the mini-cards and the new Perkbox strip, and the separate Perkbox section is gone.
