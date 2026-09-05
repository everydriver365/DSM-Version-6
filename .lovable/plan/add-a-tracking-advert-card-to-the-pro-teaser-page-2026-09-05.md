# Add a TRACKING advert card to the PRO teaser page

Recreate the supplied tracking banner as a native card on `/pro-teaser`, using the existing design language rather than embedding the reference image.

## The card

A white rounded card with a blue outline, placed in the PRO teaser page alongside the other product cards (directly under the PRO SHOP card):

- Left: the EDP TRACKING logo tile on a pale blue rounded square (uses the tracking logo asset already in the project).
- Middle: "TRACKING" in large navy Sora, with the line "Professional vehicle tracking for driving instructors."
- Three feature items with small icons: Live location (pin), Driving style reports (bars), Vehicle health checks (car), separated by thin dividers. On narrow phones these wrap to two rows so nothing is squashed.
- Right: the tracker device image on a soft blue circular wash, and the price block — "£9.99 /month", "£25 setup fee", "24 months commitment".
- A blue chevron button at the far right; tapping anywhere on the card opens the product.

On a 390–440px phone the layout stacks: logo + title row, feature row, then the price row with the device image behind it, keeping every value from the reference.

## Teaser video link

- A "Learn More" play pill on the card, exactly like the DIA / Website / Perkbox cards.
- The video is admin-managed through the existing PRO explainer videos table under a new `tracking` section key, so it can be set (YouTube, Vimeo or uploaded URL) from the admin PRO videos screen and opens in the existing full-screen modal with an X to close.
- If no video has been set, the pill simply doesn't appear.

## Tapping the card

Opens the tracking product in the marketplace. The page looks up the active tracking listing (matched on its title/slug containing "tracking") when it loads and navigates to that product page; if no such listing is found yet, it opens the marketplace list filtered to a "tracking" search so the card is never a dead end.

## Technical notes

- Only `src/routes/pro-teaser.tsx` changes, plus an asset pointer for the tracker device image if a suitable one isn't already present (`tracking-icon.png` and `telematics.png` pointers exist and will be checked first).
- Video reuses `pro_section_videos` (`section = 'tracking'`) — no schema change; the admin PRO videos screen lists sections, so the new key needs to be selectable there (one small addition in `src/routes/admin.pro-videos.tsx` if its section list is hardcoded).
- Product navigation uses the existing `/marketplace/$listingId` route; listing lookup added to the current `Promise.allSettled` data batch.
- `capacitor.config.ts`, `__root.tsx`, home and all other routes untouched.
