## Change
Revert the Schedule bottom-nav item so it navigates to the standalone `/schedule` route (new design) instead of scrolling the home carousel to workspace index 1.

## File
- `src/components/dsm/BottomNav.tsx`

## Edit
- For the Schedule item, remove the `ws: 1` / `onSelectWs(1)` behavior and restore `navigate({ to: '/schedule' })`.
- Leave Today, Pupils, Messages, and the workspace-sync event listener untouched.
- No changes to `src/routes/home.tsx` — the carousel workspace stays intact for swipe access, but the bottom-nav Schedule button opens the full page.

## Verify
- Type check.
- Tap Schedule in bottom nav → routes to `/schedule` (new design).
- Swiping the home carousel to index 1 still works.