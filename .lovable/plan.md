# Week-by-week schedule view

Change the schedule agenda from one long scrolling list of dates into a single week (Monday–Sunday) at a time, with arrows to move between weeks.

## What you'll see

- A week selector row directly under the month strip:
  `‹   Mon 24 – Sun 30 Aug   ›` with a small "This week" button that appears when you're not on the current week.
- The agenda below shows only that week's days, Monday through Sunday.
- Day cards, private events, Google events, "FILL THIS GAP" tiles and all existing styling stay exactly as they are.
- Tapping a date in the month strip jumps the week selector to that date's week (month strip stays).
- Days with nothing on show only if they're a working day (same rule as today, which drives the gap tiles); other empty days are skipped.
- Today is still auto-selected on open, and the "Today" action resets to the current week.

## Technical notes

Only `src/routes/schedule.tsx` changes.

- Add `weekStart` state initialised to `mondayOf(today)`; helpers `mondayOf` / `addDays` already exist.
- Derive `weekKeys = [ymdLocal(weekStart) … ymdLocal(addDays(weekStart,6))]` and filter `orderedDayKeysWithToday` to keys inside that range before building `rows`.
- Drop the "Week of …" divider rows from `rows` (the selector header replaces them); keep per-day `ScheduleDateDivider`.
- Loosen `workingDayKeysInRange` so it isn't limited to `key >= todayKey`, otherwise past weeks would render empty; data fetching range (`PAST_DAYS` / `FUTURE_DAYS`) is unchanged, so no new queries.
- Wire `onSelectDate` and `onToday` in `MonthStrip` to also set `weekStart`; scroll-to-date logic keeps working within the visible week.
- Empty-week state: "Nothing scheduled this week."
- Selector styling matches existing tokens: white background, 1px `#E4E8EF` divider, Poppins, arrows as `IconChevronLeft/Right` at 18px `#0B1F3A`, label 14px semibold.
