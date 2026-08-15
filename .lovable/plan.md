# Save episodes for later

Add the ability to bookmark podcast episodes and view them in a saved list, stored on this device.

## What you get

- A bookmark button on every episode card and in the episode detail modal. Tapping it saves or unsaves the episode instantly (filled icon = saved).
- A "Saved" chip in the Podcasts tab filter row, showing a count (e.g. "Saved 4"). Tapping it shows only saved episodes.
- When the Saved filter is on with nothing saved, a friendly empty state: "No saved episodes yet — tap the bookmark on any episode to save it."
- Saves persist between visits on this device (no account needed) and survive feed refreshes, because the full episode data is stored, not just the ID.

## Technical notes

Only `src/routes/live-news.tsx` changes (plus a small helper file if it keeps the route tidy).

- Persist to `localStorage` under key `dsm.podcasts.saved.v1` as an array of `PodcastEpisode` objects (capped at 200, newest first).
- Read on mount inside `useEffect` to avoid SSR/hydration mismatch; guard all access with a `typeof window` check inside the effect/handlers.
- State: `savedEpisodes: PodcastEpisode[]`, plus `toggleSaved(ep)` and `isSaved(ep)` helpers keyed by episode `guid`/audio URL fallback.
- New filter state value: reuse existing `showFilter` chip row by adding a separate `savedOnly` boolean so it composes with search, topic and show filters.
- The saved list feeds the same episode card renderer and the same mini player / next-episode queue, so playback behaves identically.
- Bookmark icons from `@tabler/icons-react` (`IconBookmark` / `IconBookmarkFilled`), styled with existing DSM tokens.
