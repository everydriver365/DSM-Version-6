# Restore Test Swap results

## Confirmed cause

The page loads `test_swap_requests` with an embedded `instructors!instructor_id` relationship. Supabase returns `PGRST200` because that relationship does not exist, and the current error handler clears the results, so the page displays no swaps.

## Implementation

- Update only `src/routes/test-swap.tsx`.
- Load swap requests without the invalid embedded relationship.
- Fetch the referenced instructor names and phone numbers separately for the returned instructor IDs, then merge those details into the swap rows so contact actions continue to work.
- Preserve the existing filters, tabs, card design, and request management behaviour.
- Keep successfully loaded swaps visible even if optional instructor contact details cannot be loaded.
- Verify the page renders swap cards and the failing `PGRST200` request is gone.

## Technical details

Use two ordinary Supabase reads rather than relying on an undeclared PostgREST relationship. The first read remains authoritative for swap visibility; the second enriches community cards only.