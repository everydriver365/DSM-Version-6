# Discover & Learn — match the reference layout

Rebuild the "Discover & Learn" block on the home screen so it matches the attached reference.

## What changes

1. **Header row**
   - Title becomes "Discover & Learn" in title case, bold navy (replacing the small uppercase blue eyebrow with the blue accent bar).
   - A blue "See all >" link on the right, opening the PRO membership page.

2. **Explore PRO banner**
   - Full-width photo banner with rounded corners: a misty blue mountain landscape (newly generated image, saved as a project asset).
   - Left: the 3D PRO logo. Middle: "Explore PRO" ("PRO" in teal) with the line "Your hub for exclusive TV, Radio, Shop & member perks."
   - Right: a white circular button with a blue arrow, plus the handwritten "More for Instructors" mark.
   - Tapping the banner keeps its current behaviour (swipes to the PRO screen).

3. **Four tiles**
   - The current inline icon row inside the banner is replaced with four separate pastel tiles in one row: PRO TV (green), PRO Radio (red), PRO Shop (blue), PRO Perks (purple).
   - Each tile: pastel tinted background, coloured line icon, bold label, and a small subtitle — "Watch & learn", "On the go", "Tools & gear", "Exclusive offers".
   - Existing destinations stay unchanged.

4. **Kept as-is**
   - The purple "Swipe left for more content" strip stays, positioned below the four tiles.

## Technical notes

- All work in `ProTeaserTile` inside `src/routes/home.tsx`, plus one generated background image in `src/assets/` referenced via an asset pointer.
- Tile labels/subtitles fit a 4-across grid at 390–440px widths; text scales down rather than wrapping.
- No data or navigation logic changes.
