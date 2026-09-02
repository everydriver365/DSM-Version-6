# PRO TV section: show 4 tiles instead of 2

## Scope
Only `src/routes/pro-teaser.tsx` is changed. No other routes, components, or configuration are touched.

## Change
1. **Fetch more videos**
   - Increase the `howto_videos` query limit from `2` to `4`.
   - Keep the `bitesize_videos` limit at `4` (already enough to top up).
2. **Display 4 tiles**
   - Change `setVideos([...howtoVideos, ...bitesizeVideos].slice(0, 2))` to `slice(0, 4)`.
3. **Layout as 2×2 grid**
   - Replace the horizontal flex row in the PRO TV section with a two-column CSS grid (`gridTemplateColumns: "1fr 1fr"`, gap `8px`, padding `0 16px 16px`).
   - Remove the vertical divider `borderRight` logic between tiles.
   - Keep each tile’s existing thumbnail, play overlay, "NEW" badge on the first tile, "Watch" badge, category, and title styling.
   - Make the empty-state message span both columns.
4. **Navigation stays the same**
   - Tapping any tile still calls `onNavigateToMedia?.()` to open the MEDIA screen.

## Verify
- Run `bunx tsgo --noEmit -p tsconfig.json`.
- Check `/pro-teaser` preview shows four PRO TV tiles when published videos exist.