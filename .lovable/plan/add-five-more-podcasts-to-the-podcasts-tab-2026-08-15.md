# Add five more podcasts to the Podcasts tab

## What you'll get

The Podcasts tab on Live & News becomes a multi-show feed covering all six podcasts, newest episodes first, with a row of filter chips at the top (All, Featured, then one chip per show). Each episode card shows the show name badge, artwork, title, date and duration, and still expands to an inline player.

## The shows and their feeds (all verified reachable)

| Show | Feed | Featured |
| --- | --- | --- |
| The Instructor (Terry Cook) | feeds.captivate.fm/the-instructor/ | Yes |
| Dipod — The Driving Instructors Podcast | rss.libsyn.com/shows/35544/destinations/89261.xml | Yes |
| Inspire Instructor Training Podcast | feeds.captivate.fm/instructor-training/ | Yes |
| Driving Instructors and Vision Zero | feeds.captivate.fm/driving-instructors-and/ | Yes |
| DIA Motormouth | rss.buzzsprout.com/2123108.rss | Yes |
| Car School Confessions | anchor.fm/s/dfbeeddc/podcast/rss | No |

The Apple Podcasts and Spotify links you gave are directories, not playable feeds, so the plan uses each show's official RSS feed (resolved from those directory pages) — that's what powers the in-app player and keeps artwork, titles and durations accurate.

Categories are stored per show exactly as you listed them (e.g. Instructor: Teaching, Business, Industry, CPD) and shown as small tags on the show chip row and episode detail.

## Technical detail

1. **`src/lib/podcasts.functions.ts`**
   - Add a `PODCAST_SHOWS` registry: `{ id, name, feedUrl, categories: string[], featured: boolean, siteUrl }`.
   - Extend `PodcastEpisode` with `showId`, `showName`, `showFeatured`, `showCategories`.
   - `getPodcastEpisodes` fetches all six feeds with `Promise.allSettled`, parses each with the existing parser, takes up to 10 episodes per show, merges, sorts by `pubDate` descending, and caps the combined list at 60. A failing feed is skipped silently so one bad feed can't break the tab.
   - Export `getPodcastShows()` (a plain exported constant, client-safe) so the UI can render chips before episodes load.

2. **`src/routes/live-news.tsx`** (only other file changed)
   - Add a horizontally scrollable chip row above the list: `All`, `Featured`, then one chip per show, DSM styling (navy active pill, white inactive, blue count).
   - Add `showFilter` state; filter the merged episode list accordingly (Featured = episodes from shows marked featured).
   - Episode cards gain a small blue show-name badge above the title; everything else (artwork, inline `<audio>`, Open-in-source link) stays as it is.
   - Tab count reflects the currently visible list.

No database changes and no other routes touched.

## Verification

- Typecheck passes.
- Load `/live-news` → Podcasts: confirm episodes from all six shows appear, chips filter correctly, and an episode plays inline.
