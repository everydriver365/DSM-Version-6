# PRO page: Perks + PRO Shop, with MEDIA-style tabs

Simplify `/pro` to two sections only — PERKS and PRO SHOP — switched by a tab bar styled exactly like the MEDIA page.

## Layout

Navy sticky header at the top (same as MediaHub: `#0B2341` background, safe-area top padding plus 44px so the TODAY | PRO | MEDIA pills don't cover it), containing two tabs:

```text
PERKS      PRO SHOP
--------
```

Tab styling copied from MediaHub: 13px Poppins, active tab white and bold with a 2px `#2C97DE` underline, inactive white at 50% opacity, thin white divider line under the row.

Below the header, a scrollable `#F4F6F8` content area with bottom padding for the nav bar.

- PERKS tab: the existing perks content (currently the 2x2 image grid) shown full-page, keeping the current cards, saving chips, image fallbacks and `/perks/{id}` navigation, plus the "See all perks" link.
- PRO SHOP tab: the existing shop listings shown full-page as the current two-column grid (no 360px height cap now that it owns the page), keeping card styling and marketplace navigation.

## Removed from the page

Radio hero and radio rails, Podcasts, Featured video card, PRO TV section, and the "Your PRO membership / Premium exclusive perks for members." intro header. Those destinations stay reachable from the MEDIA screen, `/radio` and the global menu — no routes or other files change.

## Technical notes

- Only `src/routes/pro.tsx` changes.
- Keep the existing `benefit_perks` and `marketplace_listings` queries; drop the `howto_videos` query and the podcast episode fetch that only fed the removed sections, along with their now-unused components and imports.
- Keep the exported `ProPage` signature (including `onNavigateToMedia`) so the home swipe container keeps working unchanged.
- Update the route `head()` description to reflect perks and shop.
- 8px radii and existing token colours retained. `capacitor.config.ts`, `home.tsx` and all other routes untouched.
