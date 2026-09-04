# Darken the next-lesson card map

The next-lesson card uses a Google Maps JavaScript map (`NextLessonMap` in `src/routes/home.tsx`). Its current styling only hides POI and transit layers, so the default bright Google map shows through.

## What changes

- Add a global darkening style to the map's `styles` option (around line 259 of `src/routes/home.tsx`).
- Lower lightness across all map elements, mute water/landscape/road colours, and keep labels readable.
- Preserve the existing POI/transit hiding and the green origin / red destination / blue route line.
- No data fetching, no route changes, no other component edits.

## Verification

- Run `bunx tsgo --noEmit` to confirm no type errors.
- Capture a mobile preview screenshot of the next-lesson card to confirm the map renders darker and markers/route remain visible.
