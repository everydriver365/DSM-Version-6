# Fix: gap-row threshold too low

You're right — a 30-min gap isn't a bookable lesson slot. Revert both files to only show the "Free slot" row when the gap is **≥ 60 minutes** (long enough for at least one standard lesson).

## Changes

**`src/routes/home.tsx`** (SchedulePanel timeline)
- `const showGap = next && gapMins >= 30;` → `>= 60`

**`src/routes/schedule.tsx`** (day-view rows)
- `if (gapMins >= 30) {` → `>= 60`
- Gaps of 30–59 min will fall through to the existing thin `hr` divider between lessons, same as before.

## Consequence for your current data

Your fetched lessons only contain one 30-min gap (2026-07-06 13:00→13:30). With the ≥60 rule, no gap row will render today — which is correct: there's genuinely no fillable slot. The row will appear as soon as your diary has an hour-or-more window between two lessons.

No other logic, styling, or data-fetching changes.
