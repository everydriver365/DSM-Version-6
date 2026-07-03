## Problem

The "Owes" figure on Jasmine's pupil record shows £60, but her rate is £50/hour and the booked lesson is 90 minutes (should be £75). The balance is currently summing the `amount_due` value that was stored on the lesson row when it was created — which was based on an older/default hourly rate, not her current £50 rate.

## Fix (single file: `src/routes/pupils.$id.tsx`)

Replace the live-owed calculation (lines ~401–419) so it **recomputes each unpaid lesson's cost from the pupil's current rates**, instead of trusting the stored `amount_due`.

### New live-owed logic

1. Fetch unpaid lessons with `duration_minutes` included:
   ```
   .select("duration_minutes, amount_due, payment_status, status")
   ```
2. Load the instructor's postcode rates once (via `fetchPostcodeRates`) using the already-known `instructor_id` and current session token. Cache in a ref/state so it doesn't refetch on every render.
3. For each unpaid, non-cancelled lesson, compute the expected cost using `resolveHourlyRate` from `src/lib/pricing/resolveRate.ts` with:
   - `pupilCustomRate` = `pupil.custom_rate`
   - `pupilCustomRate90` = `pupil.custom_rate_90`
   - `pupilCustomRate120` = `pupil.custom_rate_120`
   - `pupilPostcode` = `pupil.postcode`
   - `instructorDefaultRate` = `instructorRate` (already in state)
   - `postcodeRates` = fetched list
   - `durationMinutes` = lesson's `duration_minutes`
4. Sum those computed values → `setLiveOwed(total)`.
5. Fall back to `amount_due` only if all rate inputs are missing (so we never show 0 by mistake).

### Where else this needs to be consistent

The lessons history list on the same page (line 1344, `price = Number(l.amount_due ?? 0)`) will still show old stored `amount_due`. For this task I will **also** display each unpaid future lesson using the recomputed value, so the balance and the visible lesson prices match.

Completed/past lessons keep their historical `amount_due` untouched — those are actuals, not estimates.

### Out of scope

- Not backfilling/rewriting stored `amount_due` in the database.
- Not changing any other file.
- Not changing how new lessons are priced at creation time (already handled by `resolveHourlyRate` in `lessons.new.tsx`).

### Result

For Jasmine: 90 min × £50/hr = £75 → "Owes £75" instead of £60.
