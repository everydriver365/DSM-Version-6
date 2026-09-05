# Redesign schedule views

## Main Schedule
- Keep the existing navy header, lesson/calendar data, syncing, add flow, and lesson actions.
- Replace the scrolling agenda cards with a Day/Week calendar switch, seven-day selector, and an 08:00–20:00 vertical grid.
- Position lesson and calendar-event blocks by start time and duration, apply the requested status colours, and show a live current-time line on today.
- Day view shows full lesson details; Week view shows seven columns with compact first-name/time blocks.
- Keep lesson taps opening the existing actions/detail flow and retain the existing add chooser behind a 40px blue plus button.

## Home Teaching Schedule
- Keep the heading, header actions, Today/Tomorrow/Next tabs, data selection, and existing lesson tap behaviour.
- Replace lesson cards with compact time/bar/details rows and the requested status badges.
- Limit each tab to three appointments and add a centred “View full schedule →” footer.
- Leave every other home section untouched.

## Validation
- Run the TypeScript check.
- Inspect both layouts at the current mobile viewport and confirm lesson taps and add controls remain connected.
