## Plan

1. **Update the Fill My Slots date window**
   - In `src/routes/gaps.tsx`, expand the gap-detection loop from the current 14-day window to match the schedule’s future-facing range.
   - Use a named constant for the range so it is obvious and easy to adjust.

2. **Ensure all future working days are represented**
   - Keep creating `dayGroups` for every active working day in the range, including days with no lessons.
   - Preserve the current selected-date strip and selected-day-only content model.

3. **Keep existing gap rules intact**
   - Do not change the minimum 60-minute rule.
   - Do not change buffer handling, calendar blocks, recurring blocks, lunch, time off, pupil matching, or booking/message flows.

4. **Verify behavior**
   - Confirm the Fill My Slots page date strip includes future dates beyond today and that selecting them shows their available gaps or the manual-add empty state.