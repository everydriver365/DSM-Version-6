# Tasks & Actions card on the home page

Add a compact "TASKS & ACTIONS" card to the home screen, sitting directly above the Discover/Marketplace carousel. It mirrors the mock-up: a section label with a "See all" link, then up to four single-line rows, each with a tinted icon, a bold title and a right-hand value (amount, due state, or chevron).

## What it looks like

- Section header: `TASKS & ACTIONS` on the left, blue `See all` on the right.
- White card, 12px radius, hairline dividers between rows, same shadow as the other home cards.
- Row: 28px rounded icon tile, bold navy title, right-hand status text.
  - Money outstanding: red amount (e.g. `£45.00`).
  - Overdue / today: red `Due today`.
  - Soon: amber `Due tomorrow`.
  - Informational: grey chevron.
- Tapping a row navigates to the relevant page; tapping "See all" opens the full to-do list.
- Card hides completely when there is nothing to show.

## Mock first, wired second

Build it as a self-contained component with a typed `TaskItem[]` input:

```text
{ id, title, icon, value, tone: 'danger' | 'warning' | 'muted', onPress }
```

Step 1 renders from a local mock array so the design can be reviewed on device.
Step 2 swaps the mock array for a `buildTaskItems()` function that derives rows from data the home page already loads plus small existing queries:

- Payment to confirm — outstanding lesson payments (existing payments-owed helper).
- CPD / standards check evidence due — `cpd` / `standards_checks` tables.
- Unread messages count — existing unread-count hook.
- Vehicle check reminder — `checklist_completions` / vehicle record.

Rows are sorted by urgency (overdue, today, tomorrow, informational) and capped at four, with the rest behind "See all".

## Technical notes

- New file `src/components/home/TasksActionsCard.tsx`; rendered from `src/routes/home.tsx` in a `SECTION_WRAPPER_STYLE` block immediately before the Discover section.
- Uses existing tokens (Poppins, `#0B1F3A`, `#1877D6`, `#CC2229`, amber `#D68A1B`) and the shared section-header styles — no new colours.
- No schema changes; wiring reuses the queries already present in the app.

## Verification

- Typecheck/build passes.
- iPhone-width visual check: card sits above Discover, rows are single-line and not truncated.
- Empty state: with no tasks, nothing renders and the spacing above Discover stays correct.
