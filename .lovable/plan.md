## Why Sabrina shows £80 owed

Her upcoming lesson is stored as `payment_status = "unpaid"` with `amount_due = 80`. The balance/pill logic on the pupils list and the home lesson tiles just sums `amount_due` on any `unpaid` lesson — it doesn't know she has prepaid hours in the bank.

For comparison, `src/routes/end-of-day.tsx` (lines 149‑185) already excludes prepaid pupils from "unpaid" totals; the pupils list and home tiles never got that treatment.

## Fix

Treat a lesson as covered when the pupil has enough prepaid hours to cover it, and reflect that everywhere the "£X owed / £X due" pill or total appears.

### 1. Pupils list balance (`src/routes/pupils.index.tsx`)
Change the `balanceMap` build so unpaid lessons for pupils whose remaining prepaid hours ≥ lesson duration are treated as £0. Use `prepaid_hours - hoursUsed` (already computed as `hoursRemaining`) as the budget, decrement as we iterate that pupil's unpaid lessons in date order. Anything not covered stays in the owed total.

### 2. Home lesson tile pill (`src/routes/home.tsx`)
Two lesson-tile renderers (lines ~3959 and ~4820). Update the `dueUnpaid` / £-pill branch: if the pupil is prepaid AND remaining prepaid hours cover this lesson's duration, show the "Prepaid" pill instead of the £ pill. Same rule inside "Today's pupils" summaries where relevant.

### 3. Schedule timeline pill (`src/routes/schedule.tsx` `renderLessonRow`)
Apply the same rule to `isPaymentDue` / `overdue`: prepaid pupil with hours remaining → render the "Prepaid" pill, not "£80".

### 4. Lesson creation (follow-up, same change)
When creating/updating a lesson for a prepaid pupil with remaining hours, set `payment_status = "prepaid"` and populate `prepaid_hours_used` so the data is correct at the source and older displays stay in sync. This removes the need for the display-side workaround over time. Search: `src/routes/lessons.new.tsx`, any `insert` into `lessons` that sets `payment_status`.

### Notes
- "Remaining prepaid hours" is `prepaid_hours - Σ(duration_minutes/60)` over that pupil's non-deleted lessons (already computed as `hoursMap` on the pupils list; will need the same map on home/schedule).
- Partial coverage (e.g. 0.5h left, 1h lesson) counts as not covered — safer to keep showing the pill so nothing is silently under-billed.

### Files touched
- `src/routes/pupils.index.tsx`
- `src/routes/home.tsx`
- `src/routes/schedule.tsx`
- `src/routes/lessons.new.tsx` (and any other lesson insert site) — for the source-of-truth fix
