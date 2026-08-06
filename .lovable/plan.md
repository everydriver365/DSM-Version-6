Refactor the Industry news section on the homepage to a full-width horizontal tile carousel with a dot progress indicator.

What I will change (only in `src/routes/home.tsx`):

1. Data fetch: Increase `news_articles` query limit from 3 to 10.
2. Add state + refs: `activeNewsIndex`, `newsScrollRef` (renaming the existing `newsStripRef` / `newsActiveCard` references to match the new names).
3. Scroll container: Replace the old card strip with a horizontal scroll container using `scrollSnapType: 'x mandatory'`, hidden scrollbar, and `onScroll` wired to update the active dot index.
4. Tiles: Each tile becomes a full-width (`calc(100% - 32px)`) row with:
   - 48×10px thumbnail on the left (image or gradient fallback with icon).
   - Source pill, title, and "read time · date" meta in the middle.
   - Right chevron.
   - Entire tile navigates to `/news/$articleId`.
5. Dot progress indicator: Below the scroll container, centered, with an active dot expanded to 14px.
6. Remove old card layout (image-on-top cards, source pill absolute, etc.) and any trailing "See all" card inside the strip.

What I will not touch: section header, "See all" link, DSM Live section, or any other homepage section.
