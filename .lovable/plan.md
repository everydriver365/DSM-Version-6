# Why "Tomorrow" doesn't show all events

Two real limits in the home Teaching Schedule tile explain it.

## 1. The list is capped at 4 items
The tile only ever renders the first four entries (lessons + calendar events) for the selected day. Anything after that is silently dropped, even on Tomorrow.

## 2. Multi-day and overnight events are missed
Calendar events are matched to a day by the day they *start*. An event that starts today (or earlier) and runs into tomorrow, and all-day events spanning several days, never appear under Tomorrow.

## Fix

1. Show all entries for the day instead of the first four. Keep the tile compact with a "Show all (N)" expand control, so the default view stays short but nothing is hidden.
2. Match calendar events to a day by overlap (event ends after the day starts and starts before the day ends) instead of by start date, so overnight and multi-day events appear on every day they cover. All-day events keep the existing all-day treatment.

## Technical notes

- File: `src/routes/home.tsx` only.
- Remove the `.slice(0, 4)` on the timeline rows; add local expand state defaulting to collapsed at 4 rows.
- Rewrite `blocksForDate(dateStr)` to keep any block whose local start/end range intersects `dateStr`, clamping `start`/`end` minutes to 0–1440 for the requested day.
- Gap calculation already uses `computeDayGaps`; clamped multi-day blocks will feed into it correctly, so no false gaps over long events.
- No backend, data or navigation changes.
