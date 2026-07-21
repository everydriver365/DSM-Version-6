## Plan

Fix the schedule so future days with gaps are easy to access and don’t appear to be missing.

1. **Keep the existing agenda generation**
   - The agenda is already rendering future dates in the current preview, including 180 future days.
   - Keep the active-working-day rows so gap detection can run on future days even when there are no lessons.

2. **Fix date-strip navigation**
   - Update the date tap handler so when you tap a future date in the calendar strip, it scrolls to that exact rendered day.
   - The current fallback still searches only `orderedDayKeys` (entry-backed dates), so dates added purely for gap detection can be ignored.
   - Change it to search the final rendered agenda key list instead.

3. **Make future months show useful indicators**
   - Pass the existing `dotsByDay` map into `MonthStrip`.
   - Replace the current lesson-only dot with type dots, so future gap days and Google Calendar days are visible in the strip.

4. **Keep the change scoped**
   - Only touch `src/routes/schedule.tsx`.
   - No backend/database changes.

## Expected result

Future days will be reachable from the calendar strip, and the strip will indicate future days with Google events, DSM lessons, and fillable gaps instead of making it look like only today/past dates exist.