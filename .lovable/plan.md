Plan: Add a full-duration countdown to the Practical test tile and the Tests list

1. **Create a shared countdown helper** (`src/lib/dateHelpers.ts`)
   - Add a `formatCountdown(targetDate: string, targetTime?: string | null)` utility.
   - It computes the difference between now and the target date/time, and returns:
     - "Today" if the target is today.
     - "Tomorrow" if the target is tomorrow.
     - "X days left" for future dates more than 1 day away.
     - "X hrs left" if today but a time is set and still in the future.
     - "Overdue" or a past-state label if the target is in the past.
   - Keep the helper framework-agnostic so it can be used from both `pupils.$id.tsx` and `tests.tsx`.

2. **Update the Practical test tile** in `src/routes/pupils.$id.tsx` (~line 1756)
   - Import `formatCountdown`.
   - Keep the existing date/time/centre display as-is.
   - Add a new text line directly below the centre line that shows the countdown in the same text styling (e.g., `text-[10px] text-slate-500` or a subtle blue accent) only when `pupil.test_date` is set.
   - For past/completed tests, show a short status label instead of a negative countdown (e.g., "Test completed").

3. **Update the Tests list card** in `src/routes/tests.tsx` (`TestCard` component, ~line 437)
   - Import `formatCountdown` from the new helper.
   - Keep the existing date/time and the existing small "days badge" as-is.
   - Add a second line under the date/time showing the full-duration countdown for upcoming tests.
   - Past tests (the "needs result" group) do not need a countdown; leave that area unchanged.

4. **Validation**
   - Run the TypeScript typecheck to ensure the new helper and its call sites are type-safe.
   - Do a quick visual check in the pupil-detail preview to confirm the countdown appears under the Practical tile and the Tests list shows the same countdown style.

Scope: only the Practical tile in `pupils.$id.tsx` and the `TestCard` in `tests.tsx`. No live timers, no backend changes.