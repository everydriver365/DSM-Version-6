Remove the redundant navigation controls from the next lesson tile on the home page.

### What we'll change
Only `src/routes/home.tsx`.

1. **Remove the Route pill** from the top-right of the map section (the button with `<Navigation /> Route` that opens `directionsUrl`).
2. **Remove the Navigate button** from the card footer (the wide button that opens Google Maps directions).
3. **Adjust the footer layout** so the remaining Text and Call buttons still fill the footer evenly.

The map image itself, the time caption, the pupil info, and the Text/Call footer buttons remain untouched. This keeps the tile clean while preserving the still-useful contact actions.

### Files
- `src/routes/home.tsx`