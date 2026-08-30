# Quick Add: every action opens a bottom sheet

Today the green FAB menu is inconsistent: four actions open bottom sheets (Add lesson, Add test, Add event, End of lesson) and seven navigate away to full pages (Add pupil, Take payment, Add unavailability, Add course, Add note, Log enquiry, Log call). Jumping to a page loses the home screen context and looks nothing like the sheet flows.

Every quick-add action will open a bottom sheet, except Add course, which stays a full page because it is a long multi-step form.

## What changes

| Action | Today | After |
| --- | --- | --- |
| Add lesson / Add test | sheet | unchanged |
| Add event | sheet | unchanged |
| End of lesson | sheet | unchanged |
| Add unavailability | page `/quickavailability` | new sheet |
| Add note | page `/notes` | new sheet |
| Log enquiry | page `/enquiries` | new sheet |
| Log call | page `/enquiries` | new sheet (call-specific fields) |
| Add pupil | page `/pupils/new` | new sheet (core fields, "More options" link to full page) |
| Take payment | page `/take-payment` | new sheet |
| Add course | page `/courses/new` | unchanged (page) |

## Design

All new sheets use the existing shared sheet shell (`BottomSheetV2`) so they inherit the same chrome as Add lesson: grab handle, drag-to-dismiss, white close pill, navy title, canvas background, sticky footer with the standard blue save button plus a Cancel, focus trapping and Escape to close.

- Add unavailability — date, all-day toggle, start/end time, reason. Same fields as the current page.
- Add note — pupil picker (optional), title, body.
- Log enquiry — name, phone, email, source, notes.
- Log call — pupil or contact name, phone, outcome, notes; saves against the same store as enquiries.
- Add pupil — the essentials only (name, phone, email, address, default rate). A "Full pupil form" link opens `/pupils/new` for the rest.
- Take payment — pupil, amount, method, date, note.

Every sheet shows a success toast on save and closes back to the home screen, matching Add lesson.

## Technical notes

- New components under `src/components/dsm/quickadd/`: `UnavailabilitySheet`, `NoteSheet`, `EnquirySheet`, `LogCallSheet`, `QuickPupilSheet`, `TakePaymentSheet` — each wrapping `BottomSheetV2` with `SaveFooter`.
- Save logic is lifted from the existing route files (same Supabase tables, same validation); the pages stay in place and keep working, so nothing breaks for links elsewhere in the app.
- `runQuickAdd` in `src/routes/home.tsx` swaps `navigate(...)` for `setXSheetOpen(true)` for the six converted keys; `course` keeps navigating.
- Reuse `PupilPickerSheet` for pupil selection inside the note/payment sheets.
- Unsaved-changes confirmation on close, matching Add Lesson.

## Follow-up (not in this pass)

Once the FAB flows are proven, the same treatment can be applied to the other add/edit pages across the app (expenses, mileage, tests, pupil edit) in a second pass.
