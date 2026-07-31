# Plan: Lesson Details Sheet on Next Lesson Tile Tap

## Goal
Make the Next Lesson tile on `/home` tappable. A single tap/click opens a bottom-sheet modal showing the full lesson details: date, time, pupil info, pickup, and payment status. Existing buttons inside the tile (maps, notify, More) remain independently clickable and do not trigger the sheet.

## What will change

### 1. New component: `src/components/lessons/LessonDetailsSheet.tsx`
A reusable sheet built on the existing `BottomSheet` from `src/components/dsm/BottomSheetV2.tsx`. It receives a `LessonRow` object and renders:

- Header with pupil name and a close button.
- A `StatRow` showing: date, start time, duration.
- Pupil info section: name, phone (tappable to call/SMS), pickup address, postcode.
- Payment section: amount due, payment status pill (Paid / Due / Prepaid), and a "Take payment" action if money is owed.
- Footer buttons: "View pupil", "Cancel lesson", "Go to live lesson".

The sheet will match the existing DSM visual style (white card, 1px borders, 14px radius, brand blue `#1877D6`, navy `#0B1F3A`).

### 2. Update `src/routes/home.tsx`
- Add a local state `detailsOpen` (boolean) and `detailsLesson` (the selected lesson).
- Attach an `onClick` handler to the main Next Lesson card container. The handler opens the sheet.
- Wrap all existing inner buttons (View route, More, Notify pupil) with `e.stopPropagation()` so they do not also open the sheet.
- Render `<LessonDetailsSheet />` conditionally when `detailsOpen` is true.
- Reuse the already-fetched `upcoming` lesson object; no new data fetching is needed.

### 3. Files to touch
- `src/components/lessons/LessonDetailsSheet.tsx` (new)
- `src/routes/home.tsx` (add state, handler, stopPropagation on child buttons, render sheet)

## Out of scope
- No new server functions or Supabase queries. The `upcoming` lesson already contains all required fields.
- No changes to the `HeroExpandedPanel` or the existing "More" expansion behavior.
- No changes to calendar sync, live tracking, or lesson edit flows.

## Verification
- Build passes (`bun run build`).
- Tap the Next Lesson tile on `/home` in the preview: the sheet opens.
- Tap the existing "View route" or "More" buttons: the sheet does not open and the original action still works.
- The sheet displays the correct date, time, pupil name, pickup, and payment status for the upcoming lesson.
