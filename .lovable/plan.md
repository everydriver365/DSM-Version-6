# Add a Podcasts tab to Live & News

## What you'll get

A third tab — **Live | News | Podcasts** — on the Live & News page. Podcasts lists the latest episodes of *The Instructor* podcast (the-instructor.captivate.fm), each as a DSM-styled card with cover art, episode title, date and duration. Tapping an episode expands an inline audio player so instructors can listen without leaving DSM, with a "Open in Captivate" link as a fallback.

## How it works

The podcast feed is a public RSS feed (`https://feeds.captivate.fm/the-instructor/` — verified reachable, returns XML). Browsers can't fetch it directly because of cross-origin rules, so DSM fetches and parses it on the server and returns clean JSON to the page.

## Technical detail

1. **New file `src/lib/podcasts.functions.ts`** — a `createServerFn({ method: "GET" })` named `getPodcastEpisodes` that:
   - fetches `https://feeds.captivate.fm/the-instructor/`
   - parses the RSS with lightweight regex/string extraction (no new dependency; the Worker runtime has no DOMParser)
   - returns up to 20 items: `{ id (guid), title, description, audioUrl (enclosure url), pubDate, durationSecs (itunes:duration), imageUrl (item itunes:image, falling back to channel image) }`
   - decodes HTML entities and strips tags using the existing `sanitizeNewsTitle` helper in `src/lib/newsText.ts`
   - returns `[]` on any fetch/parse failure so the tab degrades to an empty state rather than erroring

2. **`src/routes/live-news.tsx`** (only file changed):
   - widen `activeTab` state to `"live" | "news" | "podcasts"` and `tabButton` to accept the new key
   - add the third tab button with the episode count, matching existing styling
   - fetch episodes on mount via `useServerFn(getPodcastEpisodes)` alongside the existing Supabase loads
   - render a Podcasts section: card layout mirroring the News cards (76px artwork, navy 14px/700 title, grey meta row with date + duration), plus a blue play/pause circle
   - a single `expandedId` state controls which episode shows the inline `<audio controls>` element; only one plays at a time
   - reuse the existing `EmptyState` and "Loading…" patterns

No database changes, no changes to the home tile (it already routes to `/live-news`), no other routes touched.

## Verification

- Typecheck passes.
- Load `/live-news`, switch to Podcasts, confirm episodes list with real titles/dates and that an episode plays inline.
