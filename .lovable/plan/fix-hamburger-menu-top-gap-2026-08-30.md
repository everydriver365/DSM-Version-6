# Fix hamburger menu top gap

## What we’re changing
The global navy header in `src/routes/__root.tsx` currently has `paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)"`. On the screenshot the hamburger icon (and the whole header row) sits flush against the top edge with no breathing room. We’ll add a small, consistent gap.

## Plan
1. **Modify `src/routes/__root.tsx`** — increase the header’s top padding from `+ 12px` to `+ 16px` (or equivalent small bump) so the hamburger, logo, and right-side icons all sit slightly lower with a visible gap below the status bar / top edge.
2. **Keep changes scoped** — only touch the global header styling; do not alter drawer/menu content, navigation logic, or other routes.
3. **Verify visually** — confirm in the preview that the hamburger no longer touches the top and the header still looks balanced on iOS.

## Files to edit
- `src/routes/__root.tsx` (header padding only)
