# Gap Filler visual refresh

Restyle the Gap Filler screen to match the clean green "free slot" card in the reference image. Presentation only — no changes to gap detection, pupil matching, SMS sending, or any data logic.

## What changes

1. Gap list cards (the horizontal day chips become proper rows)
   - Each gap renders as a soft white/green rounded card with a subtle green glow border.
   - Left block: large bold time (e.g. `14:30`) with the day underneath (`Mon 8 Sep`) in muted grey.
   - Thin vertical divider, then a calendar-clock icon.
   - Middle: `Free · 3 hours` in bold, with `N pupils available` underneath in grey.
   - Right: a soft green `Available` pill (or grey `No pupils` when zero) and a solid green `Fill →` button that selects that gap.
   - Selected gap gets a stronger green border/tint.

2. Selected-gap detail card
   - Matches the same rounded, soft-green styling with the large time treatment and duration/potential line kept as-is.

3. Pupil list
   - Keeps the existing coloured avatar circles with initials exactly as they are today.
   - Rows get slightly more breathing room, rounded card container, and the same pill styling for Available / No preference / Unavailable.
   - Checkbox and tap-to-toggle behaviour unchanged.

4. Header, window selector (7/14/21/30 days), success banner, send bar and confirmation sheet keep their current behaviour; only spacing, radii and colours are tuned to match.

## What does not change

- `computeDayGaps()`, `previewMatchForGap()`, buffers, all-day handling, the 7/14/21/30-day window logic.
- SMS queue/send flow, duplicate prevention, statuses.
- Database schema, Google sync, `capacitor.config.ts`.

## Technical notes

- All edits are confined to the JSX/inline styles in `src/routes/gaps.tsx`.
- Add local green tokens (deep green `#1E7A46`, tint `#EAF6EF`, pill text `#15683B`) alongside existing `NAVY`.
- Run typecheck and the full test suite after the change.
