# Unify swiped schedule with /schedule

## Problem

The bottom-nav "Schedule" tab opens `src/routes/schedule.tsx` (calendar/agenda toggle, month grid, agenda list). Swiping right from the Today workspace on `/home` lands on workspace index 1, which is a separate ~1000-line inline schedule implementation inside `src/routes/home.tsx` (lines ~5082–6058). The two look and behave differently.

## Approach

Make the swipe entry point delegate to the real `/schedule` page instead of maintaining a parallel implementation. `/schedule` already integrates with the workspace swipe model (swiping left/right there navigates back to `/home` with `ws=0` or `ws=2`), so the round-trip UX is preserved and both entry points show byte-identical UI.

## Changes

1. **`src/routes/home.tsx` — swipe/activation handlers**
   - In `scrollToWs(i)` and `handleCarouselScroll` (around lines 1590–1630), when the resolved workspace index is `1`, call `navigate({ to: "/schedule" })` and return early instead of scrolling the carousel to that panel.
   - Same guard in the `dsm-workspace-request` event listener so BottomNav / other triggers requesting index 1 also route to `/schedule`.
   - Keep `WS_COUNT` and all other indexes unchanged so pupils=2, money=3, etc. still align with WorkspaceDots and the existing swipe math in sibling pages.

2. **`src/routes/home.tsx` — inline schedule section (lines ~5082–6058)**
   - Replace the entire `data-workspace="schedule"` section body with an empty placeholder `<section data-workspace="schedule" data-ws-index={1} />` that preserves the carousel slot (so scroll-snap indexes for pupils/money/etc. stay correct) but renders nothing. Users never see it because activation redirects to `/schedule` first.
   - Delete the now-unused helpers and state that were exclusive to the inline schedule (safe to remove only if not referenced by other workspaces; otherwise leave in place).

3. **No changes to `src/routes/schedule.tsx`** — it already handles swipe-back to `/home` with `ws=0`/`ws=2` and shows WorkspaceDots with `activeIndex={1}`.

## Result

- Bottom-nav "Schedule" → `/schedule` (unchanged).
- Swipe right from Today workspace → triggers navigation to `/schedule` (same component, same layout, same data).
- Swipe left/right from `/schedule` continues to move to Today (`ws=0`) or Pupils (`ws=2`) via the existing handler in `schedule.tsx`.
- Single source of truth for the schedule UI; future changes only need to happen in one file.
