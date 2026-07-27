## Why only two tiles appear

Verified in `src/components/home/DiscoverSection.tsx`: both Discover fetches request a single row each.

- Live sessions query ends with `...&limit=1&select=...` and the component renders only `liveTop = sorted[0]`.
- Marketplace query ends with `...&order=is_featured.desc,created_at.desc&limit=1` and the component renders only `marketTop = market[0]`.

So the carousel can never contain more than one Live card and one Marketplace card, regardless of how much data exists. The scroll track only "scrolls" because of the 20px peek spacer added earlier.

## Plan

Only `src/components/home/DiscoverSection.tsx` changes.

1. Raise the fetch limits: `limit=5` for `dsm_live_sessions` (upcoming, ordered by date/time) and `limit=5` for `marketplace_listings` (featured first, then newest).
2. Render a card per item instead of only the top one:
   - Map the sorted live sessions into Live cards (live-now sessions first, then soonest).
   - Map the marketplace listings into Marketplace cards.
3. Interleave the two lists so the first screenful shows one Live and one Marketplace card (Live, Marketplace, Live, Marketplace, ...), preserving today's first impression.
4. Keep the existing card visuals unchanged: `calc(50% - 5px)` width, `flexShrink: 0`, `scrollSnapAlign: "start"`, StackMedia offset media, Join/View buttons.
5. Remove the 20px peek spacer — with more than two cards the track overflows naturally and scrolls on its own.
6. Keep graceful behaviour when data is thin: if only one Live and one Marketplace item exist, the section renders exactly as it does today (two tiles, no spacer, no scroll).

## Technical notes

- Both queries are direct REST `fetch` calls with the anon key already present in the file; only the `limit` value and the render loop change.
- `liveTop`/`marketTop` single-item variables get replaced by arrays; the derived `marketImg` / `marketPrice` helpers move into the per-card render so each listing computes its own image and price string.
- No changes to the DSM Learn "tip of the day" row below, the `/discover` page, or any data model.