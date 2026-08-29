# Fix: avatar badge missing next to hamburger

## What's happening

The small avatar badge on the hamburger icon only renders when a first initial is
available. That initial comes from `localStorage`/a custom event that is only ever
written **after the slide-out menu has been opened at least once** — the instructor
record is fetched inside the drawer's `open` effect. On a fresh app load the value is
empty, so the badge is hidden.

## The fix

In the header component (`src/routes/__root.tsx` only):

1. Load the instructor once on mount instead of waiting for the drawer:
   - read the cached name from `localStorage` first (instant paint, no flicker),
   - if there is no cache, fetch the signed-in user and their `instructors` row
     (`name`, `profile_image_url`), then cache and broadcast it using the existing
     `dsm-instructor-name` event so the drawer keeps reusing it.
2. Keep the existing event listener so the badge updates if the drawer refreshes it.
3. Render the real profile photo in the 16x16 badge when `profile_image_url` exists,
   falling back to the blue circle with the first initial. Same size, position,
   border and colours as now.
4. Hide the badge entirely when signed out.

No other files change. Nothing touches `capacitor.config.ts`.
