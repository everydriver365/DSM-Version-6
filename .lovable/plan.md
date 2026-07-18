## Goal
Make the Home and Settings pages share the same light canvas (`#DCE4F0`) as the rest of the app on mobile.

## Changes

**1. `src/routes/home.tsx` (root wrapper, around line 4314)**
- Replace the hard-coded navy full-screen `<div style={{ ...background: '#0B1F3A' }}>` with `PageLayout` (import from `@/components/PageLayout`).
- Keep the existing `position: fixed`, `100dvh`, flex-column, overflow, safe-area padding behaviour by passing them through `style` / `className` on `PageLayout` (its default background is `#DCE4F0`, which is what we want).
- Leave every child untouched — the top bar, cards, timeline, drawer, etc. already have their own backgrounds and will now sit on the light canvas like other pages.

**2. `src/routes/settings.tsx`**
- Remove the `<WorkspaceDots activeLabel="Settings" />` line (currently line 692) so the navy strip beneath the sticky top bar goes away. Also drop the now-unused `WorkspaceDots` import.
- Nothing else changes: `PageLayout` already provides the `#DCE4F0` background, and the single sticky navy top bar stays as it is (matches other detail pages).

## Out of scope
- No changes to `manifest.json` `theme_color` (the iOS status-bar tint is a separate PWA concern; ask if you want that adjusted too).
- No visual changes to any card, header, or component internals — only the page-level canvas.