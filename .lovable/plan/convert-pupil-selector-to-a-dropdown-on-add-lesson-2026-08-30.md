# Convert pupil selector to a dropdown on Add Lesson

## Problem
On the Add Lesson sheet the pupil list currently expands inline inside the form. On small screens this leaves almost no room for results — only one pupil row is visible at a time and the rest are hidden off-screen (see uploaded screenshot).

## Goal
Replace the inline expandable pupil list with a compact dropdown trigger that opens a dedicated pupil-selection surface, giving the full list and search field enough room.

## Changes
1. **Compact trigger row in `src/components/lessons/AddLessonSheet.tsx`**
   - Keep the existing `SheetRow` look but remove the inline search input and result list.
   - Show the selected pupil name + initial avatar, or the placeholder "Select pupil".
   - Add a chevron to indicate it opens a dropdown.

2. **New pupil-selection dropdown sheet**
   - Create a small reusable component (or inline panel) that renders a `BottomSheetV2`-style sheet titled "Select pupil".
   - Include a sticky search input at the top.
   - Render pupils as a scrollable list of full-width rows with avatar initials, matching the existing row style.
   - Highlight the currently selected pupil.
   - Show "No pupils found" when the filter returns nothing.
   - Selecting a pupil closes the sheet and updates `pupilId`.

3. **Preserve existing behaviour**
   - Keep the `useEffect` that pre-fills pickup from the selected pupil's address.
   - Keep validation error for missing pupil.
   - Keep filtering logic (`pupilQuery`) but move it inside the dropdown sheet.

## Files to touch
- `src/components/lessons/AddLessonSheet.tsx` (main change)
- Optional: extract a `PupilPickerSheet` into `src/components/lessons/PupilPickerSheet.tsx` if it keeps the parent file cleaner.

## Out of scope
- No changes to lesson saving logic, pricing, calendar sync, or test-day fields.
- No changes to other sheets or routes.
