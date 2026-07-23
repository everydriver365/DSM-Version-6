
# Pupil detail page — Phase 1 restructure

## Shared-component impact
No shared component needs to change for this phase.
- `BottomSheetV2` already accepts `title` / `subtitle` / `footer` / `children` — reused as-is for the new "More" quick-actions sheet.
- `PupilQuickActionsSheet` is for long-press on the pupils list and is unrelated.
- Payment helpers (`recordPayment`, `deletePaymentRecord`) are not touched in Phase 1.
- All existing sheets (`CancelLessonSheet`, `DeleteLessonSheet`, `ChangeDateTimeSheet`, `ConfirmDialog`, edit sheet, cert sheet, adjust-lessons sheet) stay wired to the same state.

If you'd rather I extract the new Overview cards into files under `src/components/pupils/` instead of keeping them inline in `pupils.$id.tsx`, say so — I'd default to inline for Phase 1 to keep the diff isolated.

## Two things I need to confirm before I write code

1. **What the "Lessons / Payments / Profile" tabs should render.** Your line reads *"leave their real content exactly where it currently lives in the file, untouched, for now."* Two possible reads:
   - **(A) Gate it:** Wrap today's giant JSX (past/upcoming lessons list, prepaid card, payment history, address/notes/tests/rates/emergency/licence/colour/etc.) in `{activeTab === '…' && (…)}` conditions. Nothing is deleted or moved; the JSX literally stays in the file where it is, just conditionally rendered. Placeholders show only when the tab has no matching legacy block.
   - **(B) Placeholders only:** All three non-Overview tabs render just the "Coming in next update" card, and the existing JSX is temporarily hidden entirely until Phase 2.

   I'll go with **(A)** unless you say otherwise — it matches "untouched" and keeps the app functional.

2. **Hero 3-up stat definitions.** Confirm:
   - Balance = `liveOwed − account_balance` (net; red if owed, green if credit, "All paid" at zero) — same math as today's balance tile.
   - Hours remaining = `Number(pupil.prepaid_hours ?? 0) − hoursCompleted`, floored at 0, 1 dp.
   - Days-to-test = `daysBetween(today, pupil.test_date)`; "Not booked" if null; "Today" / "Tomorrow" / past = "Passed?".
   - "Lessons bought" (kept alongside) = `confirmedLessonCount + (lesson_count_adjustment ?? 0)` — same as adjust-lessons sheet's `currentTotal`.

## New structure

```text
<Sticky header>  back · name · call · edit · delete           (unchanged)
<Hero card>
  avatar + name + status pill
  email row: value OR "No email set" (pencil → inline edit — reuses saveEmail)
  3-up stats: Balance | Hours remaining | Days to test
  "Lessons bought: N"   (kept, same source as today)
<Quick actions row>  Call · Message · Text · Add lesson · More
<Tab bar>  Overview | Lessons | Payments | Profile
<Tab content>
```

### Overview tab
- **Tests card** — theory row + practical row, each tap-to-edit (reuse today's `theoryEditing` / `practicalEditing` state + save handlers).
- **Readiness card** — the exact block currently at lines ~1300–1410, lifted verbatim into the Overview tab.
- **Next lesson card** — map (existing Google Maps pickup block), date/time/duration, address, Here / Going / Arrived buttons (reuse existing handlers), then Reschedule / Send payment link / Cancel lesson stacked below (reuse existing `sendPaymentLink`, `navigate` to `/lessons/reschedule/$id`, cancel sheet).
- **Messages preview card** — the exact block currently at lines ~2134–2154.

### Lessons / Payments / Profile tabs
Placeholder card: "Coming in next update". Existing content stays in the file, gated by the tab condition per option (A) above.

### "More" sheet (BottomSheetV2)
Every remaining quick-action tile currently in the grid at lines 1806–1896:
Certificate, History, Progress, Syllabus, Test day, Mock test, Navigate (opens Google Maps to pickup / pupil address), Send payment link, Reflective log, Test result.

## Data bindings & handlers — where each lives after Phase 1

| Binding / handler | Source (line today) | New home |
| --- | --- | --- |
| `pupil` fetch (lines 645–685) | effect | unchanged |
| `lessons`, `pastLessons`, `pupilSeries` | effects | unchanged (rendered in Lessons tab, gated) |
| `paymentHistory`, `paymentHistoryRefresh`, realtime channel (500–539) | effects | unchanged (rendered in Payments tab, gated) |
| `liveOwed`, `balance`, `unpaidLessons`, `hoursCompleted`, `instructorRate`, `postcodeRates` | effects | unchanged; Hero stats read from them |
| `progressData`, `syllabusPct`, `syllabusSum`, `syllabus` | effects | unchanged; readiness on Overview |
| `unreadMessages` (688–707) | effect | Overview Messages card + Message quick action badge |
| `lastMessage` (482–494) | effect | Overview Messages preview |
| `emailEditing`, `emailDraft`, `savingEmail`, `saveEmail` | state + fn (627–637) | Hero email row |
| `centreInfo`, `centrePickerOpen`, `centreSearch` | state | Tests card on Overview (tap practical row) |
| `theoryEditing`, `practicalEditing` + save handlers | state | Tests card on Overview |
| `focusLessonId` search param + `focusedLessonCardRef` (543–561) | effect | Next lesson selection unchanged |
| `sendPaymentLink`, `markPaid`, Here/Going/Arrived handlers | inner fns (~2020–2170) | Next lesson card, moved with the block |
| `actionsOpenFor`, `changeDateTimeSheetFor`, `cancelSheetFor`, `deleteSheetFor` | state | Lessons tab (gated) |
| `certOpen`, `certMilestone` + jsPDF handler | state + inline fn (3251–3386) | "More" sheet trigger + existing cert sheet stays mounted |
| `adjSheetOpen`, `adjValue`, `adjNote`, `adjSaving`, `saveAdjustment` | state + inline fn (3112–3248) | Profile tab (gated) |
| `editSheetOpen`, `editDraft`, `openEditSheet`, `saveEditSheet` | state + fns (353–463) | Header pencil (unchanged) |
| `prepaidEditing`, `prepaidHoursDraft`, `accountBalDraft`, `prepaidSaving` | state | Payments tab (gated) |
| `removeOpen`, `removePupil`, `ConfirmDialog` | state + fn | Header trash (unchanged) |
| `addressEditing`, `saveAddressFromLookup`, `AddressLookup` | state + fn (568–613) | Profile tab (gated) |
| `intakeAnswers`, `PupilRatesAndColour`, `ReadyToLearnCard`, `UnavailablePeriodsCard`, emergency contact, licence, DVLA request sheet | subcomponents / state | Profile tab (gated) |
| `notesDraft`, `savingNotes`, `noteSaved`, `notesOpen` | state | Profile tab (gated) |
| `uploadingPhoto`, `photoRef`, photo consent toggle | state | Hero avatar (photo upload retained on tap) |
| `pupilSeries` (recurring lessons) | state | Lessons tab (gated) |

## Diff shape (approximate)

- **Additions (~350 lines inline):** `activeTab` state, `MoreSheet` component, `HeroCard`, `QuickActionsRow` (5 tiles), `TabBar`, `OverviewTab` (composes `TestsCard`, existing readiness JSX moved in, `NextLessonCard`, `MessagesPreviewCard`), `LessonsTab` / `PaymentsTab` / `ProfileTab` wrappers that gate the existing JSX and fall back to the placeholder card.
- **Removals:** the old inline `SectionHeader "QUICK ACTIONS"` block and its 11 tiles.
- **Untouched JSX:** every block currently rendering lessons lists, payment history, prepaid card, notes, address, licence, emergency contact, rates, colour, EverySwap, sheets, subcomponents. They only get a surrounding `{activeTab === 'x' && …}` wrapper.

## Verification before finishing
- Post the full diff of `src/routes/pupils.$id.tsx` back to you in one message.
- `bun run build` to catch any JSX imbalance / missing binding.
- Confirm at 440×807 in the preview that: Overview renders end-to-end with real data; tab switches keep local state and don't refetch; the "More" sheet opens with all 10 tiles.

Reply "go" (with any tweaks to the two open questions) and I'll implement.
