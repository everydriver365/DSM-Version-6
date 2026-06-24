I’ll make one targeted change in `src/routes/take-payment.tsx` only.

Plan:
- Keep the existing QR and Cash tabs, amount display, tabs, and action buttons unchanged.
- Replace the current auto-sized/squashed numpad layout in both QR and Cash sections with a real keypad block:
  - 3 equal-width columns.
  - 4 evenly spaced rows.
  - Buttons with a consistent touch-friendly height.
  - Full-width rows so the numbers are not bunched to one side.
  - No page scrolling introduced.
- Apply the exact same keypad styling to both numpad grids so QR and Cash match.

Technical details:
- Only edit `src/routes/take-payment.tsx`.
- Change each numpad outer grid from row-wrapper based sizing to a stable keypad grid layout.
- Remove the layout combination that is making rows/buttons appear cramped, especially the `justifyContent: "start"` behavior on the grid.