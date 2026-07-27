## Plan: Make DSM Live and DSM Learn rows swipable

### Goal
Allow the user to swipe through every available DSM Live session and DSM Learn video in the Discover section, mirroring the horizontal scroll behaviour already in place for the Marketplace carousel.

### Files to change
- `src/components/home/DiscoverSection.tsx` only.

### What will change

1. **DSM Live row becomes a horizontal scroll list**
   - Replace the single full-width Live card with a horizontal scroll container.
   - Render one full-width card per item in `liveSorted` (live-now sessions first, then upcoming).
   - Keep the existing card styling: white card, 1px `#E2E8F0` border, 12px radius, soft shadow, 10px padding, navy icon box, red live dot, `Join` pill, and tap-to-navigate to `/dsm-live/$sessionId`.
   - Add a small invisible right spacer so the last card is fully swipeable.
   - Hide the entire Live strip when there are no upcoming sessions.

2. **DSM Learn row becomes a horizontal scroll list**
   - Replace the single "tip of the day" row with a horizontal scroll container showing all `playable` learn videos.
   - Keep the existing styling: white card, 1px border, 12px radius, soft shadow, light-grey icon box with play icon or thumbnail, title + "DSM Learn" subtitle, and chevron-right on the right edge.
   - Tapping a card opens the video URL in a new tab (or navigates to `/learn` if no URL is available).
   - Add a small invisible right spacer for swipeability.
   - Hide the strip when there are no playable learn videos.

3. **Reusable scroll container**
   - Extract the current Marketplace carousel scroll wrapper into a small internal helper (`ScrollStrip`) so Marketplace, Live, and Learn share the same snap-scroll, gap, and hide-scrollbar styles.
   - Marketplace content itself stays unchanged: still shows only marketplace listings.

### What stays the same
- Data fetching, limits, and sorting.
- Marketplace carousel content and card design.
- Header with "Discover" and "See more" link to `/discover`.
- Navigation targets and tap behaviour per card.
- Overall page layout and margins around the section.

### Verification
- Run TypeScript check.
- Check the preview to confirm three independent horizontal strips: Marketplace, Live, Learn.