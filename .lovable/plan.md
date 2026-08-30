# Redesign the Quick Add menu (green FAB)

The current menu is a narrow 244px dropdown floating beside the FAB: 11 cramped rows, a scrollbar that clips items mid-row ("Log enquiry" cut in half), and it covers the whole right side of the home screen. Replace it with a proper bottom sheet.

## New design

A bottom-anchored sheet, full width, rounded top corners (20px), light background, sliding up from the bottom with a dimmed backdrop.

- **Grab handle** at the top, then the title "Quick add".
- **3-column tile grid** instead of a list. Each tile: 56x56 rounded icon chip in the item's colour with a white icon, label underneath in two lines max, centred, on a white card with 12px radius.
- All 11 actions fit in 4 rows with no scrolling, so nothing is clipped.
- Grouped with small section labels for scanability:
  - Teaching: Add lesson, Add test, End of lesson, Add unavailability, Add event
  - People: Add pupil, Log enquiry, Log call, Add note
  - Business: Take payment, Add course
- Sticky **Cancel** button at the bottom above the safe-area inset.
- Tap backdrop or Cancel to close; tapping a tile closes and runs the same action as today.

## Technical notes

- Only `src/routes/home.tsx` changes.
- `QUICK_ADD_ITEMS` gets an added `group` field; render loops over the groups.
- `runQuickAdd`, `quickAddOpen` state and the FAB button behaviour (rotating plus) are unchanged.
- Sheet respects `env(safe-area-inset-bottom)` and sits above the bottom nav.
