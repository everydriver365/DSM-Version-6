# Remove top border from "View full schedule" button

## What's changing

Remove the thin grey line above the "View full schedule →" footer button in the Teaching Schedule tile.

## Files

- `src/routes/home.tsx`: remove the `borderTop` style from the "View full schedule →" button at the bottom of the Teaching Schedule tile (around line 7390).

## Technical notes

- The line is currently drawn by `borderTop: '0.5px solid #F4F6F8'` on the footer button.
- Removing only that property keeps the button text, padding, background, and tap behaviour unchanged.
