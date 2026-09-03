# Refine Community section on PRO teaser page

## Goal
Make the Community preview on `/pro-teaser` feel calmer, more cohesive and premium by removing the large teal curved hero and any strong coloured vertical accent lines, while keeping all required labels, badges and content.

## Current state
The Community section in `src/routes/pro-teaser.tsx` has:
- A full-width curved teal gradient hero with the Community icon, "COMMUNITY" title and "2 new" badge.
- White post cards with a light grey border (`#EDEFF3`) and soft shadow.
- A TIP/COVER AVAILABLE badge, engagement icons, pagination dots and a navy "Create post" CTA panel at the bottom.

## Changes
In `src/routes/pro-teaser.tsx`, update only Section 7 (COMMUNITY):

1. **Remove the curved teal hero header.**
   - Replace it with a compact inline section header that matches the style of other PRO teaser sections.
   - Keep the small teal `IconUsers`, the uppercase "COMMUNITY" label, the red "2 new" badge and the "See all →" action on the right.

2. **Keep the intro text.**
   - Keep the navy heading: "Connect with other instructors, share tips and find cover in your area".
   - Keep the subtitle: "Learn. Share. Support each other.".

3. **Ensure no coloured structural accents on post cards.**
   - Cards remain clean white.
   - Use an extremely subtle border (`#F0F1F4` or very pale teal equivalent) and a restrained shadow.
   - Do not add any solid teal/green/purple vertical left border or large left accent stripe.
   - Keep rounded corners.

4. **Keep post card content unchanged.**
   - Two compact post previews per carousel page.
   - Author avatar, name, time-ago, more-options button.
   - TIP badge in teal, COVER AVAILABLE badge in purple.
   - Post title/excerpt.
   - Engagement icons/counts (heart, comment, bookmark).
   - Carousel pagination dots below the cards.

5. **Remove the "Create post" CTA panel.**
   - The user explicitly does not want the navy "Have something to share?" panel in this section.

6. **Ensure visual cohesion.**
   - No large coloured backgrounds or header artwork.
   - Section should sit between surrounding PRO teaser sections without feeling like a separate app screen.
   - Keep bottom navigation untouched (it is rendered externally).

## Verification
- Run `tsgo` typecheck.
- Open the preview at `/pro-teaser`, scroll to Community, and confirm the teal hero and Create post panel are gone, the new inline header is visible, and the cards still show two previews with correct badges and pagination dots.
