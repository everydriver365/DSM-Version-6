# Pass real recurring blocks and time off to `computeDayGaps` in home.tsx

## Goal
Stop the home teaching schedule tile from calculating false gaps over Google Calendar events and booked time off by supplying real `recurringBlocks` and `dayTimeOff` data to every `computeDayGaps` call.

## Current state
`src/routes/home.tsx` calls `computeDayGaps` four times (today/tomorrow free-slot lookup, `computeFreeMinutes`, and the teaching schedule tile render). All four currently pass empty arrays:

```ts
recurringBlocks: [],
dayTimeOff: [],
```

These arrays are not fetched anywhere else in the component.

## Proposed change
1. Fetch the two datasets once when the instructor ID is known:
   - `instructor_recurring_blocks` where `instructor_id = userId` and `is_active = true`.
   - `instructor_time_off` where `instructor_id = userId`, overlapping today and tomorrow (`start_date <= tomorrowISO` and `end_date >= todayISO`).
2. Store them in local state (e.g. `recurringBlocks`, `timeOff`).
3. Derive `dayTimeOffForDate` helpers so each call passes only the rows relevant to the date being checked.
4. Update all four `computeDayGaps` calls in `src/routes/home.tsx` to use:
   ```ts
   recurringBlocks: recurringBlocks || [],
   dayTimeOff: dayTimeOffForDate(dateStr) || [],
   ```

## Scope
- Only `src/routes/home.tsx` is modified.
- `capacitor.config.ts` is not touched.
- No gap-card styling changes.
- No navigation changes.

## Verification
- Run `bunx tsgo --noEmit` after the edit.
- Show the updated `computeDayGaps` calls before finishing.
