# Bring back "Fill this gap" and "Move lesson" in the schedule

The redesigned schedule grid shows lessons and calendar events, but the two actions from the old list view are unreachable: seeing a free gap you could fill, and moving a lesson by picking a new slot. This adds both back, using the grid itself.

## Free gaps in the grid

- Each day column draws its free gaps (already calculated by the existing gap logic, which respects working hours, buffers, time off and calendar events) as a soft amber, dashed, tappable slot behind the lesson blocks.
- A gap shows its time range and, when tall enough, the potential earnings figure already produced by that logic.
- Tapping a gap opens a small sheet with the gap's day, time range, length and value, plus two buttons:
  - "Find pupils" — goes to the existing gap-filling page for that day.
  - "Add lesson" — opens the current add flow pre-set to that date and start time.
- In week view the gaps render the same way, just without the text labels.

## Moving a lesson

- The lesson actions sheet gains a "Move lesson" item, which closes the sheet and puts the schedule into move mode (the existing move banner at the top of the page, showing which lesson is being moved, with Cancel).
- In move mode, only slots that are long enough for that lesson are tappable. Each free gap is split into 15-minute start options, and each option shows the start time.
- Tapping a slot opens the existing "Move lesson?" confirmation, which already shows the old and new time and saves the change, notifies the pupil and refreshes the schedule.
- Everything outside the slots is inert while moving, so a mistap can't open a lesson instead.

## Scope

- Only the schedule page changes. The home teaching tile, add flows, notifications and data loading stay as they are.
- The existing gap calculation, move handler and confirmation dialog are reused unchanged.

## Technical notes

- `src/routes/schedule.tsx` only.
- Add a memoised `gapsByDay` map for the days currently visible, built with the existing `detectGaps` helper and the same inputs already used for the calendar dot indicators (per-day working hours, buffers, calendar blocks, recurring blocks, time off, `minGapMinutes`).
- Render gap overlays inside `gridColumn`, positioned with the same `GRID_START` / `HOUR_HEIGHT` maths as `renderBlock`, at a lower z-index than lesson blocks.
- Reuse the existing `movingLesson` / `moveMode` / `confirmMove` state and `handleMoveLesson`; the only new wiring is setting `moveMode` from the actions sheet and setting `confirmMove` from a slot tap.
- Verify with `bunx tsgo --noEmit` and a Playwright pass over the day and week grids.
