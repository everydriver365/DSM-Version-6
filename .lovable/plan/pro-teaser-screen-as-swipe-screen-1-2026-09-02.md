# PRO teaser screen as swipe screen 1

Add a new PRO teaser overview screen between TODAY and the existing PRO page, so the swipe order becomes TODAY → PRO (teaser) → FULL (existing PRO) → MEDIA.

## New file: src/routes/pro-teaser.tsx

Same pattern the existing `pro.tsx` uses: a route file that also exports the page component so `home.tsx` can render it inline.

`ProTeaserPage` props: `onNavigate?`, `onNavigateToMedia?`, `supabase`, `session`.

White full-height scrollable page, 100px bottom padding for the tab bar. All data loads on mount in parallel with a 3-second loading timeout so the page never hangs on a slow query.

Data pulled from the existing Supabase tables:

- Featured perk — `benefit_perks` (active, 1 row)
- Perk categories with counts — `benefit_perks` category column, grouped client-side
- Shop — `marketplace_listings` (active, not deleted, newest 2)
- PRO TV — `howto_videos` (published, by sort_order, 2)
- News — `news_articles` (not hidden, newest 2)
- Community — `local_chat_messages` with instructor name (newest 2)
- Radio — live state from the existing `useProRadioContext`

If any query returns nothing, that section renders its empty/placeholder state rather than disappearing.

## Sections (in order)

1. **PRO header** — "Every Driver PRO" eyebrow, "Your professional ecosystem" headline, tag pills (Perks, PRO Shop, Radio, PRO TV, News, Community). The perks pill shows the live perk count.
2. **PRO Perks** — teal header with "See all →" to `/perks`; hero row with gift icon and headline; category grid tiles (Health, Shopping, Professional and others) with counts, each linking to `/perks`; featured perk row with name, saving and "Claim →".
3. **PRO Shop** — amber header with "Browse all →" to `/marketplace`; two product tiles with thumbnail (camera placeholder when missing), title and price.
4. **PRO Radio** — blue header with "All stations →" to `/radio`; tile 1 is the live station with LIVE dot, now-playing text and a working play/pause button wired to the shared radio context; tile 2 is a dimmed "coming soon" station.
5. **PRO TV** — blue header with "See all →" switching to the MEDIA screen; two video tiles with thumbnail, play overlay, duration badge, NEW badge on the first, category and title.
6. **News** — red header with "See all →" to MEDIA; two image tiles with gradient overlay, category colour, title and relative time.
7. **Community** — teal header with unread badge and "See all →" to `/community`; two post tiles with initial avatar, author, time ago and 3-line clamped body.

Every section uses the shared header pattern (10px uppercase label left, 11px blue action link right) and the specified spacing, colours and radii.

## src/routes/home.tsx changes (swipe wiring only)

- Screens become 4: TODAY (0), PRO teaser (1), existing PRO page (2), MEDIA (3).
- Swipe threshold bound changes from `< 2` to `< 3`; each panel's `left` offset recalculated for four positions.
- Pill selector becomes TODAY | PRO | FULL | MEDIA.
- Four dot indicators.
- The existing home "Explore" tile keeps pointing at screen 1 (now the teaser); the existing PRO page's `onNavigateToMedia` moves to screen 3; MediaHub navigation unchanged.
- Teaser wired with `onNavigate` → router navigate, `onNavigateToMedia` → screen 3, plus `supabase` and `session` from the existing page state.

Nothing else in `home.tsx` changes. `pro.tsx`, `MediaHub.tsx`, all other routes and `capacitor.config.ts` are untouched.
