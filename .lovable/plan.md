## Goal

Restructure the Home "Discover" section so the scrollable top tiles show **only Marketplace listings**, and add two full-width rows underneath matching the uploaded reference: a **DSM Live** row and the existing **DSM Learn** row.

Only `src/components/home/DiscoverSection.tsx` changes.

## Layout after the change

```text
Discover                                 See more >
[ Marketplace card ][ Marketplace card ]  → scrolls
┌───────────────────────────────────────────────┐
│ [icon•]  Standards check          [ Join ]    │  DSM Live (next/live session)
│          Live · 10:10am tomorrow              │
└───────────────────────────────────────────────┘
┌───────────────────────────────────────────────┐
│ [▷]      Blue light                     >     │  DSM Learn (tip of the day)
│          DSM Learn                            │
└───────────────────────────────────────────────┘
```

## Changes

1. **Carousel** — remove the live/marketplace interleave loop; render only `market.map(marketCard)` plus the existing scroll spacer. Card size, styling, snap scrolling and per-item navigation to `/marketplace_/$listingId` stay as they are.

2. **New DSM Live row** — full-width white card (1px `#E2E8F0`, 12px radius, same soft shadow, 10px padding, 12px gap) placed directly under the carousel, using the first item of `liveSorted`:
   - Left: 44px navy `#0B1F3A` rounded square with a white broadcast icon; small red dot badge on the top-right corner of that square when the session is live now.
   - Middle: session title (15px, semibold, navy, single-line ellipsis) with `Live · {time day}` underneath (11px, `#6B7A90`) reusing `fmtTimeDay`.
   - Right: navy "Join" pill button.
   - Whole row taps through to `/dsm-live/$sessionId`.
   - Hidden entirely when there are no upcoming sessions.

3. **DSM Learn row** — keep the existing tip-of-the-day row and behaviour, restyled to match: same 44px left tile with play icon (light grey `#EEF2F7` background, grey icon, no offset stack), title + "DSM Learn" subtitle, and the "Watch" button replaced with a grey chevron-right on the right edge.

4. Delete the now-unused `liveTile`/`marketTile`/`TileShell`/`TileBody`/`SeeMore`/`CategoryPill` helpers only if they are genuinely unreferenced after the edit, to keep the file clean and typecheck-safe.

## Not changing

Data fetching queries, the "See more" header link to `/discover`, the `/discover` page itself, and the Home page layout around the section.
