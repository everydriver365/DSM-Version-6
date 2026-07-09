## Problem

On `/home`, the bottom nav "Schedule" button is wired to `scrollToWs(1)`, which slides the in-home workspace carousel to an old embedded schedule panel. It does not open the redesigned Schedule tab. The new agenda + sticky month calendar we built lives only at the `/schedule` route.

Every other entry point on home (Quick Access tile, "Full schedule →", empty-state buttons, etc.) already navigates to `/schedule` and shows the new design correctly.

## Change

In `src/routes/home.tsx`, inside the `HOME BOTTOM NAV` block (around line 7182), change the `schedule` item so it navigates to the `/schedule` route instead of scrolling the workspace carousel:

```ts
{ key: 'schedule', label: 'Schedule', Icon: ScheduleIcon,
  onClick: () => navigate({ to: '/schedule' as never }) },
```

Also drop `activeWs === 1 ? 1` from the `activeIndex` calculation so the Schedule tab no longer lights up based on the carousel position (it's a route jump now, matching how Messages already works).

Nothing else changes — the embedded workspace panel #1 stays in place for anyone still swiping the carousel, and all other nav items keep their current behaviour.

## Files

- `src/routes/home.tsx` — two-line edit in the bottom-nav block.

## Verification

- Reload `/home`, tap Schedule in the bottom nav → lands on `/schedule` with the sticky month calendar + agenda list.
- Other bottom-nav buttons (Today, Pupils, Messages, More) behave exactly as before.
