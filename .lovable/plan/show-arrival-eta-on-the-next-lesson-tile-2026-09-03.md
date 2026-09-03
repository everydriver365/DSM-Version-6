# Show arrival ETA on the next lesson tile

The next lesson tile already calculates drive time from the instructor's current location (GPS, falling back to the home postcode) and shows it as "12 min". It also already works out the projected arrival clock time, but only reveals it when you are running late ("Arriving ~14:52 — let Sam know?").

This change surfaces the arrival ETA all the time, so at a glance you see both how long the drive is and what time you'd arrive at the pupil.

## What changes

- On the next lesson tile footer row (next to "View route · 12 min"), add an "Arrive 14:52" ETA.
- Colour it neutral navy when you'd arrive before the lesson start, and red when the projected arrival is after the start time (2+ minutes late), matching the existing late logic.
- Keep the existing late-warning banner and traffic/weather chips exactly as they are.
- The ETA only shows when the lesson is within the next 12 hours and a drive time is available — same conditions already used for the late warning.

## Technical notes

- Single file: `src/routes/home.tsx`.
- `etaLabel`, `lateMin` and `isLate` are already computed in the tile's IIFE (around line 5687) from `driveData.durationMinutes` and `lessonDateTime(upcoming)`. No new data fetching, no new server function, no Maps/API changes.
- The values are computed at render time; they refresh whenever the tile re-renders or the drive-time effect re-runs.
- Rendered inside the existing footer row alongside the "{driveData.durationMinutes} min" span.
