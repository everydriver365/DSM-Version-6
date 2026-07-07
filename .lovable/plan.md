## Why the numbers differ

- **Pupils list (`pupils.index.tsx`)** sums the stored `lessons.amount_due` for unpaid lessons. Jasmine's booking has £60 saved on the row (an old rate, or a rate captured before her custom/postcode rate changed).
- **Pupil card (`pupils.$id.tsx`)** ignores the stored `amount_due` and recomputes live: `resolveHourlyRate(pupil, postcodeRates, defaults) × (duration_minutes / 60)`. For Jasmine that's £50 × 1.5h = £75.

So the list is showing stale stored values, and the card is showing the correct live value.

## Fix

Only touch `src/routes/pupils.index.tsx`. Make the list use the same live recomputation as the pupil card so the two pages always agree.

1. Import `resolveHourlyRate` from `@/lib/pricing/resolveRate`.
2. In the balance-loading effect, also fetch what the resolver needs:
   - From `pupils` (already loaded): `id`, `postcode`, `custom_hourly_rate`, `custom_rate_60`, `custom_rate_90`, `custom_rate_120` (add any missing columns to the select).
   - From `instructors` for the current `uid`: `default_hourly_rate` (+ any 60/90/120 defaults already used by the pupil card).
   - From `instructor_postcode_rates` for the current `uid`: outward-code overrides.
3. Change the unpaid-lessons query to also select `duration_minutes` (and any pupil-linking fields already used).
4. Build `balanceMap` by iterating unpaid lessons and, for each one, computing:
   `rate = resolveHourlyRate({ pupil, postcodeRates, instructorDefaults }); amount = rate * (duration_minutes / 60);`
   then summing per `pupil_id`. Do not read `amount_due` from the row.
5. Leave the rest of the list rendering (credit / prepaid / "All paid ✓") unchanged — only the sum feeding `balanceMap` changes.

### Technical notes

- Reuse the exact resolver call shape used in `pupils.$id.tsx` so both pages stay in lockstep. If that page passes extra fields (e.g. lesson `duration_minutes`, postcode overrides keyed by outward code), mirror them here.
- No schema changes; no writes; no other files touched.
- After the change, Jasmine will read £75 on both the list and her card.