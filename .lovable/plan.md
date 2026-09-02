# Revert PRO page perks section to previous design

## What's happening

`src/routes/pro.tsx` was recently updated with a new PRO PERKS hero/category-card design (commit f281bca22). The task was only meant to redesign the perk tile on the teaser page (`src/routes/pro-teaser.tsx`), so the PRO page changes need to be undone.

## Change

Restore `src/routes/pro.tsx` to the version immediately before the redesign (commit 6421c4b5a). That version keeps the two-tab PERKS / PRO SHOP layout but uses the original section header, featured card, and 2×2 grid without the new hero banner or category cards.

- Only `src/routes/pro.tsx` is touched.
- `src/routes/pro-teaser.tsx` and all other files are left as-is.
- `capacitor.config.ts` is not touched.

## Verification

- Run `bunx tsgo --noEmit -p tsconfig.json` after the revert.
- Check `/pro` still loads and shows the PERKS / PRO SHOP tabs with the previous card layout.
