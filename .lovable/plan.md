## Fix — gap tile on empty days

**Scope:** mobile home only (`src/routes/home.tsx`, redesigned body block). No changes to data fetching, gap-matching logic, or routes.

### Behaviour

When the selected tab (Today / Tomorrow / Next) has **zero lessons**, the gap tile becomes a single full-day gap using the instructor's working-hours window, and taps through to `/gaps` as it does today.

### Data source

- Reuse the existing working-hours values already loaded on this page (`workStart` / `workEnd` on the instructor row). If either is missing (per current console logs they're often `undefined`), fall back to **9:00 AM → 6:00 PM**.
- For the "Next" tab (which shows lessons across several upcoming days), if it happens to be empty we skip the empty-day gap tile — a generic "9h free" tile isn't tied to a real date and would be misleading.

### Tile content

- Icon chip, colours, radius, chevron: unchanged from the current gap tile.
- Title: `"{N} hrs free · {start time}"` e.g. `9 hrs free · 9:00 AM` (using the same 12h format helper already added).
- Caption: `"No waitlist match"` — same as today, since per-gap waitlist data isn't fetched on the dashboard.
- Tap target: `navigate({ to: '/gaps' })` — unchanged.

### Where the change lives

Inside the existing `firstGap` IIFE around line 4064 in `src/routes/home.tsx`:

1. If `firstGap` exists → render as today (unchanged).
2. Else if `tab !== 'next'` and `sorted.length === 0` → build a synthetic gap from work-window start/end and render the same tile with the "N hrs free" title.
3. Else → render nothing (current behaviour).

No other tiles, no other files, no new state or fetches.