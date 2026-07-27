Goal: Make the Discover section tiles fit two across the viewport while remaining horizontally scrollable.

Current state verified: `src/components/home/DiscoverSection.tsx` sets each tile to `calc(50% - 5px)` and uses a flex row with `overflowX: "auto"`. With only two tiles (DSM Live and Marketplace), the combined width equals 100% of the track, so no overflow is generated and the track does not scroll.

Plan:
1. Keep the two visible tiles at `calc(50% - 5px)` so two tiles fit exactly on the page.
2. Add a small, non-visible peek element (e.g., a 20px transparent spacer or extra right padding) at the end of the scroll track.
3. This creates a slight overflow, which restores horizontal scrolling while maintaining the "two tiles fit on the page" layout.

Technical details:
- File: `src/components/home/DiscoverSection.tsx` only.
- Add a spacer `<div>` after the Marketplace tile inside the existing horizontal scroll container, with `width: 20px`, `flexShrink: 0`.
- Keep existing `scrollSnapType`, `scrollSnapAlign`, and hide-scrollbar CSS.
- Do not change the tile width, existing data fetching, or the separate DSM Learn row below.

After the change, the track will show two full tiles on the viewport and still be swipeable/scrollable.