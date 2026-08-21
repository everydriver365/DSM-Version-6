# Remove the grey strip under the dashboard top bar

## Goal
On the Dashboard (`/home`), the navy top bar should sit flush against the navy "Dashboard" header block, with no light grey line between them.

## What the code currently does (confirmed)

- `src/components/dsm/InstructorTopBar.tsx` is `position: fixed; top: 0` with
  `padding: calc(max(env(safe-area-inset-top,0px),24px) + 12px) 18px 16px` and a 48px-tall logo,
  so its real height is `max(env,24px) + 76px`.
- It exports `TOP_BAR_SPACER = calc(max(env(safe-area-inset-top,0px),24px) + 64px)` — 12px less than the bar's real height.
- `src/routes/home.tsx` pads the page by `TOP_BAR_SPACER`, then pulls the navy header block back up with
  `marginTop: calc(-1 * TOP_BAR_SPACER)` and re-adds it as padding.
- Between the fixed bar and that scrolling section, `notifBanner` and `<PushPermissionCard />` render in the same flex column, so any height they occupy pushes the navy block down and exposes the page background.

The exact source of the visible strip (spacer/height mismatch vs. an in-flow element above the section) is not yet confirmed on a running device-sized page, so the first step is to measure it rather than guess.

## Plan

1. **Measure** the rendered geometry on `/home` at a mobile viewport: bottom edge of the fixed top bar, top edge of the navy Dashboard block, and the height of anything rendered between them (`notifBanner`, `PushPermissionCard`). This pins the strip to one cause.
2. **Fix the cause found**, in the smallest possible edit:
   - If it is the spacer mismatch: correct `TOP_BAR_SPACER` so it equals the bar's real height (`max(env(safe-area-inset-top,0px),24px) + 76px`), keeping the exported constant as the single source of truth.
   - If it is an in-flow element above the section: make the navy header block start at the top of the page area instead of relying on the negative margin (for example, move the banner/card inside the scrolling section, or render the navy block behind them).
3. **Do not** change the top bar's own padding, the logo size, or the safe-area handling — only the alignment between bar and header block.
4. **Re-check** `/home` and one other page that uses `TOP_BAR_SPACER` (e.g. `/gaps`, `/schedule`) to confirm nothing is now overlapped or over-padded.

## Files touched
- `src/components/dsm/InstructorTopBar.tsx` (constant only, if that is the cause)
- `src/routes/home.tsx` (header block alignment, if that is the cause)
