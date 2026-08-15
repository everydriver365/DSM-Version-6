# Recommended shows + The Diary Of A CEO

Add a curated "Recommended" band to the top of the Podcasts tab and bring in The Diary Of A CEO as a business/mindset pick alongside the driving-industry shows.

## What you'll see

- A **Recommended** row at the top of the Podcasts tab: horizontally scrollable cards showing show artwork, show name, a one-line "why we recommend it" note, and the latest episode title. Tapping a card filters the list to that show; tapping its play button starts the newest episode in the mini player.
- **The Diary Of A CEO with Steven Bartlett** added to the show registry (feed verified working) with topics: Business, Mindset, Growth, Leadership. It appears in the show filter chips, the topic filter, search, and the Recommended row.
- Existing shows keep their behaviour; the Recommended row is a shortcut, not a replacement for the chips.

## Which shows are recommended

Recommended = a curated flag on the show registry, separate from "featured". Initial picks:

- The Instructor — the core UK instructor interview show
- DIPOD — instructor community and road safety
- Inspire Instructor Training — Part 3 and Standards Check prep
- The Diary Of A CEO — business growth and mindset for running your school

## Technical notes

- `src/lib/podcasts.ts`: add `recommended: boolean` and `recommendedNote: string` to `PodcastShow`; add the Diary Of A CEO entry (`https://feeds.megaphone.fm/thediaryofaceo`, site `https://stevenbartlett.com/doac/`, `featured: false`, `recommended: true`). Carry `showRecommended` through `PodcastEpisode` so filtering/search stays client-side.
- The feed is large, so keep the existing per-feed episode limit and the 60-episode overall cap; sorting stays newest-first across all shows.
- `src/routes/live-news.tsx`: render a `RecommendedShows` row above the search box on the Podcasts tab, built from `PODCAST_SHOWS.filter(s => s.recommended)` plus the newest loaded episode per show. Cards reuse the existing card styling tokens (white, 16px radius, `#E4E8EF` border, Poppins) and wire the play button to the existing `playEpisode` handler, so the mini player and episode modal need no changes.
- No backend, schema, or auth changes.
