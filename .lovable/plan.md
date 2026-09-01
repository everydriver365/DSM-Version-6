# Add a third swipe screen: MEDIA

Adds a MEDIA screen to the right of PRO in the existing HOME ↔ PRO swipe, with three internal tabs: NEWS, PRO TV, PODCASTS.

One note before building: the brief says "do not change home.tsx", but Changes 1, 3, 4 and 9 (swipe container, pills, dots, rendering MediaHub) can only live in `src/routes/home.tsx`. Those edits are confined to the swipe shell — no existing HOME content, no PRO content, no routes touched.

## Swipe container (home.tsx)

The current swipe does not use a 300vw track. It uses two absolutely positioned full-width panels animated with `left`. That approach was chosen deliberately to fix sheets rendering half off-screen, so I'll extend it rather than replace it with a transform track:

```text
activePage:      0            1            2
HOME panel     left: 0      -100vw       -200vw
PRO panel      left: 100vw     0          -100vw
MEDIA panel    left: 200vw   100vw           0
```

Touch handlers extend to allow 0↔1↔2 (swipe left increments, right decrements, clamped at 0 and 2). The MEDIA panel gets `overflowY: auto`, `WebkitOverflowScrolling: touch`, background `#F4F6F8`, and renders `<MediaHub />`.

Pills become TODAY | PRO | MEDIA (same active/inactive styling already in place), and a third dot is added, all keyed off `activePage === 2`.

MediaHub is rendered with an `onNavigate` prop wired to the existing `navigate`; it imports the shared `supabase` client directly (same pattern the rest of the app uses), so no session prop is needed.

## New file: src/components/media/MediaHub.tsx

Header on `#0B2341` with safe-area top padding, "MEDIA" title, and a three-tab bar (NEWS / PRO TV / PODCASTS) using the specified active underline `#2C97DE`. Content area below on `#F4F6F8`, scrollable.

### NewsTab
Queries `news_articles` (id, title, description, image_url, category, source, published_at, read_time_mins) where `is_hidden = false`, newest first, limit 20. Category filter pills (All · Top Stories · Latest · Road Safety · Motoring), a hero card for the first article, then a 2-column grid for the rest. Tapping a card navigates to `/news/$articleId` (the real article route in this project).

### TvTab
Queries `howto_videos` (published, ordered by `sort_order`, limit 20). Filter pills, a featured card with play overlay, category badge and duration badge, then a 2-column grid. Tapping any video navigates to `/dsm-live`.

### PodcastsTab
Podcast feeds are fetched server-side (browser can't fetch the RSS hosts directly), so this uses the existing `getPodcastEpisodes` server function via `useServerFn`, plus `PODCAST_SHOWS` imported from `src/lib/podcasts.ts` for the "Popular shows" list. Sections: filter pills, featured episode card, "Latest episodes" list with 52px artwork and play buttons, and "Popular shows" rows with chevrons.

Play buttons in this first version open the relevant show/episode link; no new audio player is introduced.

## Scope

- Edited: `src/routes/home.tsx` (swipe shell only), new `src/components/media/MediaHub.tsx`.
- Untouched: `pro.tsx`, all existing routes and pages, `capacitor.config.ts`.
