Scope: only `src/routes/gaps.tsx`.

1. Change `GAP_FILLER_FUTURE_DAYS` from 180 back to 14 so the date strip / slot list covers only the next 14 days.
2. Update the floating action bar so the "Find pupils for N slots" button:
   - Only renders when `selectedSlots.length > 0` (hide the bar entirely otherwise).
   - Uses the actual selected count, never the total available slots.
3. Leave message-send, book-now, and selection logic untouched.

Verify: with no selection, no action bar shows; selecting slots shows "Find pupils for {selectedSlots.length} slot(s)"; date strip ends 14 days out.