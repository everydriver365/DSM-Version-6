# Podcasts tab: mockup layout in DSM style

Rebuild the Podcasts tab on `/live-news` to follow the uploaded layout, using DSM colours (navy #0B1F3A, blue #1877D6, canvas #EEF2F7, cards #fff) and Poppins — not the purple/dark styling in the reference image.

## New section order

1. **Header block** — round blue-tint mic chip, "Podcasts" title (20/800 navy), subtitle "9 podcasts · 60 episodes" from live counts.
2. **Continue listening** — row header with a blue "View all" link. Single card showing the most recently played unfinished episode: 64px artwork, show name in blue 11px, episode title navy 14/700 (2 lines), blue progress bar plus "X min left", and a large circular Continue button on the right. Data comes from the existing `podcastProgress` helpers (`resumePosition`, `remainingLabel`); the card hides when nothing is in progress.
3. **Featured** — horizontal carousel of recommended shows: 116px square artwork tiles with rounded corners, a white play circle overlaid bottom-right, show name below (13/700 navy) and latest-episode duration in grey. Tapping the tile filters to that show; the play circle plays the latest episode.
4. **Search** — existing search field, restyled to the taller pill in the mockup.
5. **Browse by category** — chips row keeping the existing topic filter, restyled: navy filled pill for the active chip, white outlined chips with a small Tabler icon per category, and a trailing chevron affordance.
6. **Latest episodes** — restyled list cards: 72px artwork, blue show badge, navy 14/700 title (2 lines), grey "date · duration" meta, then a bookmark outline button, the 48px blue play circle, and the existing overflow (⋮) menu.

## Kept as-is

Show-filter chips ("All / Featured / TED Talks / per show") stay, moved directly above Latest episodes so the category and show filters read as one filter stack. Player, mini-player, saved state, episode detail modal, share and transcript behaviour are unchanged.

## Technical detail

- Only `src/routes/live-news.tsx` changes; the podcasts render block is extracted into small local sub-components (`PodcastHeader`, `ContinueCard`, `FeaturedRow`, `CategoryChips`) inside the same file for readability.
- No changes to `src/lib/podcasts.ts`, feeds, server functions, or the Live/News/Saved tabs.

## Verification

Typecheck passes; load `/live-news` → Podcasts and confirm continue-listening, featured carousel, category chips and episode cards render and play.
