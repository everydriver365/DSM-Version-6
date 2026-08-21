# Consolidate Learn, Bitesize and Showcase into one "DSM Learn" tile and page

## What changes for the user

- The Discover & Learn grid loses the separate Learn, Bitesize and Showcase tiles and gains a single **DSM Learn** tile.
- Tapping it opens one page with three tabs — **Learn**, **Bitesize**, **Showcase** — each showing exactly the content that lives on those pages today (videos, library, uploads, comments, likes, admin controls).
- Old links to `/learn`, `/bitesize` and `/showcase` still work; they land on the new page with the matching tab already selected.
- The Marketplace, Perks and Live/News tiles are untouched.

## How it will be built

**1. New route `src/routes/dsm-learn.tsx`**
- `validateSearch` accepts `tab: "learn" | "bitesize" | "showcase"` (defaults to `learn`), so the tab is in the URL and back navigation returns to the right tab.
- Wrapped in `DSMTopSheet` titled "DSM Learn", with a tab bar styled like the existing Discover tab bar (navy active pill, hairline inactive).
- Renders one of three page bodies depending on the active tab.

**2. Extract the three page bodies into components**
The existing route files hold their whole UI in an internal component. Each body moves, unchanged, into:
- `src/components/learn/LearnPageBody.tsx` (from `src/routes/learn.tsx`)
- `src/components/learn/BitesizePageBody.tsx` (from `src/routes/bitesize.tsx`)
- `src/components/learn/ShowcasePageBody.tsx` (from `src/routes/showcase.tsx`)

All existing state, Supabase queries, upload flows, bottom sheets, comment/like logic and admin controls move across as-is. Each body drops its own page-level header/back chrome (the tabbed shell provides it) and accepts nothing but optional props already needed. Existing shared components (`LearnLibrarySection`, `LearnVideosSection`, `BitesizeLearnVideos`, `BottomSheetV2`, `ConfirmSheet`) keep working unchanged.

**3. Keep the old routes as redirects**
`/learn`, `/bitesize` and `/showcase` each become a thin route that redirects to `/dsm-learn?tab=…`, preserving published URLs and any in-app links (e.g. the Learn quick-action in `home.tsx`, the "See all" action on `/discover`).

**4. Rework the Discover & Learn grid** (`src/components/home/DiscoverSection.tsx`)
- Remove the Learn, Bitesize and Showcase tiles.
- Add one **DSM Learn** tile in their place, using the green Learn palette and `IconBook`, subtitle "Guides, bitesize & showcase", navigating to `/dsm-learn`.
- Keep the existing red unread dot behaviour (currently driven by `showcaseCount`) on the new tile, and keep the counts fetch that feeds it.
- Re-lay the grid so the remaining tiles (Perks hero, Marketplace, Live/News, DSM Learn) fill the rows cleanly with no gaps; Marketplace tile styling stays exactly as-is.

## Files touched

- `src/routes/dsm-learn.tsx` (new)
- `src/components/learn/LearnPageBody.tsx`, `BitesizePageBody.tsx`, `ShowcasePageBody.tsx` (new, moved code)
- `src/routes/learn.tsx`, `src/routes/bitesize.tsx`, `src/routes/showcase.tsx` (reduced to redirects)
- `src/components/home/DiscoverSection.tsx` (tile consolidation)

No database, edge function or business-logic changes.
