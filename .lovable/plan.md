# Gap finder: what's wrong and how to fix it

## What I found

I traced the gap finder end to end: the shared calculator (`src/lib/gapDetection.ts`), the setting that controls it (`src/lib/gapPrefs.ts`), the schedule page, the home teaching tile, and the older `/gaps` screen.

**1. Gaps shorter than an hour can never appear.**
The minimum-gap setting is forced to at least 60 minutes both when it's saved and when it's read. Even if you choose 30 minutes, the app rewrites it to 60, so a 30 or 45 minute window is silently discarded everywhere.

**2. A day is skipped entirely unless it is explicitly marked as a working day.**
On the schedule, a day only produces gaps when your per-day hours record for that weekday has "active" set to true. If your per-day hours were saved without that flag (older records, or days edited before the flag existed), every day counts as non-working and no gaps show at all — even though lessons still display. The home tile does the same thing by collapsing the day's window to zero width. This is the most likely reason nothing shows for you, and it needs checking against your actual saved hours first.

**3. Today's gaps disappear as the day goes on.**
The calculator never offers a slot starting within the next 30 minutes, and the home tile shows at most four gaps for today/tomorrow only. Later in the day, "today" legitimately looks empty.

**4. Google Calendar handling is inconsistent between screens.**
- The schedule does subtract Google events and private busy events.
- The home tile subtracts Google events **only** on Today and Tomorrow. On the "Next" tab it just looks lesson-to-lesson and ignores calendar events completely.
- The home tile never subtracts recurring blocks, time off, or private "busy" events — the schedule does. So the two screens can show different free time for the same day.
- The schedule only loads calendar events that *start* inside the visible range, so a multi-day event that began earlier doesn't block anything.
- The saved "all-day" flag on an event is thrown away before the calculation; the app re-guesses all-day status from the times instead. A normal event running 00:00–23:59, or an all-day event stored with odd times, gets classified wrongly — either wrongly ignored or wrongly blocking the whole day.

**5. Some gaps are computed but not visible on the schedule grid.**
The Day/Week grid draws only the hours that already contain something. Gaps falling before the first or after the last entry of the day get clipped off the visible area.

**6. There is no "who could fill this" suggestion where you need it.**
Pupil matching (availability days, preferred times, notice period, preferred lesson length, time since last lesson) exists only inside the old `/gaps` screen. The gap sheet on the schedule shows a plain alphabetical dropdown of every pupil, and both it and the home tile just link out to `/gaps`.

## Proposed fix

**Step 1 — Confirm the cause before changing behaviour**
Check the saved working hours and per-day hours for the account, plus the calendar events stored for the affected days, and add a temporary diagnostic readout (working window used, blocks subtracted, gaps produced) so we can see exactly why a day comes back empty. Fixes 2 and 4 depend on what this shows.

**Step 2 — Make the minimum gap setting real**
Remove the hidden 60-minute floor so 30 and 45 minute windows can surface, with a sensible lower bound (15 minutes).

**Step 3 — Treat "no per-day record" as a working day**
Fall back to the main working-days list whenever a day's per-day record has no explicit active flag, instead of treating it as a day off.

**Step 4 — One consistent busy list on every screen**
Give the home tile the same inputs the schedule uses: Google events, private busy events, recurring blocks and time off — including on the "Next" tab. Load calendar events that overlap the range rather than only those starting in it, and pass the stored all-day flag through to the calculator instead of guessing.

**Step 5 — Make computed gaps visible**
Extend the Day/Week grid's hour range to cover the working day so early and late gaps are drawn, and keep the gold "Fill this gap" band styling and tap behaviour as they are.

**Step 6 — Suggest pupils in place**
Move the existing pupil-matching scoring out of `/gaps` into a shared helper, and use it in the schedule gap sheet and the home gap row: show the best-matching pupils for that exact slot at the top of the picker, with a short reason (fits their availability, due a lesson), keeping "see all pupils" and the existing booking flow underneath.

## Technical notes

- Shared calculator: `src/lib/gapDetection.ts` (`computeDayGaps`) — correct in isolation; the problems are in its inputs and its consumers.
- Floor to remove: `readMinGapMinutes` / `writeMinGapMinutes` in `src/lib/gapPrefs.ts`.
- Active-day checks: `schedule.tsx` `gapsByDay` / `workingDayKeysInRange`, and `resolveDayHours` in `home.tsx`.
- Home inputs: `computeDayGaps` there is called with `recurringBlocks: []` and `dayTimeOff: []`, and the "next" tab uses a separate lesson-to-lesson loop.
- All-day flag: `detectGaps` in `schedule.tsx` drops `is_all_day` when mapping blocks; `ComputeDayGapsParams.calendarBlocks` needs an optional `is_all_day` field.
- Grid clipping: `GRID_START` / `GRID_END` in `schedule.tsx`.
- Matching logic to extract: `scoreSlot` / `slotFitsPupilWindow` in `src/routes/gaps.tsx`.
