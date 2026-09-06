# Show gaps everywhere, with the day they fall on

## What's wrong

1. **The gap card doesn't say which day it is.** On the home teaching tile the card shows only "10:30–13:19" — no date. On the Next tab, where gaps can span several days, there is no way to tell which day a gap belongs to.

2. **The schedule page treats most days as "not working".** Free slots on the schedule page (day grid, week grid, All list, Free tab, and the orange dot on the day strip) are all built from one calculation that marks a day as a working day only when its saved day settings explicitly say `active = true`. Any day whose settings exist but never had that flag written is treated as a day off, so no gaps are produced for it — which is why gaps appear almost nowhere. The home tile already has the corrected rule (a day counts as working unless it is explicitly switched off), so gaps still show there.

## Fix

1. Use the same day-active rule on the schedule page as on home: a day is off only if its settings explicitly say off; otherwise fall back to the instructor's working-days list. Apply it in all three places that decide it (day-strip dots, free slots per day, and the working-day range used by the All/Free lists).
2. Add the day to every gap card on the home tile: "Today", "Tomorrow", or e.g. "Mon 8 Sep" above the time range, so gaps on the Next tab are unambiguous.
3. Keep gaps visible inside the schedule itself — the day and week grids already draw tappable dashed free-slot bands and the All list already interleaves gap rows; with the rule fixed these start appearing again. No new tab or layout.

## Technical notes

- Files: `src/routes/schedule.tsx` and `src/routes/home.tsx` only. `capacitor.config.ts` untouched.
- In `schedule.tsx`, replace the three `dayConfig ? dayConfig.active === true : workingDaysList.includes(dayName)` checks (in `workingDayKeysInRange`, `dotsByDay`, `gapsByDay`) with `dayConfig ? dayConfig.active !== false : workingDaysList.includes(dayName)`.
- In `home.tsx`, in the "Free gaps" card renderer, add a small day label derived from the gap's start date compared with today/tomorrow; styling stays as-is (dashed amber card, Fill this gap button, pupil avatars).
- No backend, query, or navigation changes.
