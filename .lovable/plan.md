# Make sure the "My website" tile shows in Quick Access

## What I found

The tile already exists in the code:

- `src/routes/home.tsx:3892` — `{ label: "My website", route: "/minisite" }`, third entry in `quickAccessTiles`.
- The home Quick Access grid uses the whole list (`quickTiles = quickAccessTiles`) split into pages of 6, so it should be the third card on page 1.
- `src/routes/quickaccess.tsx:73` — the "See all" page also lists `My Website` → `/minisite`.

Nothing in the render path filters or hides it. So the tile is missing from what you're looking at, not from the source — almost certainly a stale published build or a cached preview bundle.

## Plan

1. Verify on the live app in a browser session: load the home page, read the Quick Access cards on page 1, and confirm whether "My website" renders. Screenshot as evidence.
2. If it renders in preview but not on the published site: republish so the deployed bundle picks up the current tile order. No code change needed.
3. If it genuinely does not render, fix the cause found in step 1. The two realistic candidates:
   - the page 1 slice not including index 2 (pagination/scroll offset), or
   - a runtime error in the tile list breaking the first page render.
   Fix stays inside the Quick Access block of `src/routes/home.tsx`.
4. Confirm tapping the tile navigates to `/minisite`.

## Scope

Only `src/routes/home.tsx` if a code change turns out to be needed. No changes to other sections, tiles, or styling.
