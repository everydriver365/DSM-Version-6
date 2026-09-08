# Green free-slot styling across Gap Filler, Schedule and Home

The Gap Filler screen was already restyled with green slot cards, but the free-slot rows on Schedule and Home are still amber/gold dashed rows, so the app still looks unchanged where you were looking. This makes all three consistent.

## What changes

### Gap Filler
- Push the card design further so it clearly matches the reference: larger start time, day label underneath, thin divider, clock icon, "Free · 2hr" and "N pupils available", a rounded Available pill, and a solid green Fill button.
- Add small pupil avatar circles on each slot card (top 3 matches, overlapping), same coloured circles used elsewhere.
- Selected card keeps a soft green fill and green border.

### Schedule (day rows)
- Replace the amber dashed free-slot block with the same green card: green border, soft green background, green time text, "Free · duration", overlapping pupil avatars, and a green "Fill →" button.
- Behaviour unchanged: tapping still opens Gap Filler.

### Home (today's timeline)
- Replace the gold gap row styling with the green equivalent: green time, green dotted spine, "Free · duration", "N pupils available", green "Fill →" button.
- Move mode keeps its existing blue highlight and "Move here" button untouched.

## Shared colours
Green tokens used consistently: `#1E7A46` (green), `#15683B` (deep), `#EAF6EF` (tint), `#CFE8DA` (line).

## Not touched
Gap detection, pupil matching, SMS sending, Google Calendar sync/display, lessons, recurring blocks, time off, database schema, and `capacitor.config.ts`.

## Verification
Typecheck, full test suite, and a rendered check of Gap Filler, Schedule and Home free-slot rows.
