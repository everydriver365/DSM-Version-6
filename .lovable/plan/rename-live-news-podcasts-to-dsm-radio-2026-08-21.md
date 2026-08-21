# Rename "Live, News & Podcasts" to DSM Radio

## What changes

Naming and labels only. No routes, data, queries or components are moved or rewired.

1. **Home tile** (`src/components/home/DiscoverSection.tsx`)
   - Title text "Live, News & Podcasts" becomes "DSM Radio".
   - Subtitle "News and Live Events" becomes "Live, news and podcasts".
   - The tile still opens `/live-news`; the on-air state, pulsing dot and colours stay exactly as they are.

2. **Page header** (`src/routes/live-news.tsx`)
   - The top sheet title "DSM News" becomes "DSM Radio".
   - The existing tab bar underneath already has Live, News, Podcasts (plus Saved) — it stays as is, with all current content and behaviour untouched.

## Notes

- Route stays `/live-news` so existing links, the article back button and deep links keep working.
- No database, edge function or query changes.

## Files touched

- `src/components/home/DiscoverSection.tsx` (two text strings)
- `src/routes/live-news.tsx` (one title string)
