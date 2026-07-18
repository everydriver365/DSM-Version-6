## Why the previous change didn't fully land

`PageLayout` on Home and Settings does paint `#DCE4F0`, but inner wrappers inside Home paint their own near-white fills over it, so the canvas is never visible:

- `src/routes/home.tsx` line ~4466: each horizontal swipe panel (Today / Tomorrow / etc.) sets `background: '#F7FAFC'` on a full-height scroll container — this covers the entire body area of Home.
- `src/routes/home.tsx` line ~964: the marketplace section wrapper sets `background: '#F7F8FA'` with negative side margins, painting edge-to-edge.

Settings uses `PageLayout` directly and I did not find an equivalent full-body inner wrapper painting a different color. The perceived mismatch on Settings is almost certainly the same visual effect the user is describing on Home (cards on near-white vs. cards on the `#DCE4F0` canvas everywhere else).

## Change

Only touch `src/routes/home.tsx`.

1. Replace `background: '#F7FAFC'` on the swipe-panel container (~line 4466) with `background: PAGE_BACKGROUND` (already imported from `@/components/PageLayout`).
2. Replace `background: '#F7F8FA'` on the marketplace section wrapper (~line 964) with `background: PAGE_BACKGROUND`.

No changes to card fills, header, navy blocks, buttons, or logic. If, after this, Settings still visibly differs, I'll follow up with a targeted Settings-only pass — but based on the code read, Settings already sits on the correct canvas and just needed Home to stop covering it.

## Verification

- Screenshot Home at 440×807 via Playwright and confirm the canvas around cards matches other pages (`/pupils`, `/schedule`).
- Screenshot Settings for comparison.