# Fix the price shown on the Next lesson card

## What's happening

The price pill is wired up — the lesson query does fetch `amount_due`, `paid_amount` and `payment_status`, and the card reads them. The logic itself is what produces wrong numbers.

Current rule in `src/routes/home.tsx` (next-lesson block):

- If the lesson counts as "paid", show `paid_amount`.
- Otherwise show `amount_due`.

Three cases where that gives a wrong figure:

1. **Block / prepaid / national-intensive pupils.** They are treated as paid because they have prepaid hours, but `paid_amount` on the lesson row is usually `0`, so the pill shows **£0.00** instead of the lesson value.
2. **`amount_due` is 0 or missing.** The lesson is auto-classified as paid and again shows `£0.00` rather than the real lesson price.
3. **Partially paid lessons.** `payment_status = 'partial'` is treated as fully paid, so the pill shows only the part-payment and hides the outstanding balance.

Elsewhere in this same file there is already an explicit comment that `paid_amount` is unreliable in historic data and that `amount_due` is the source of truth — the next-lesson card is the one place not following that.

## Proposed fix (home.tsx only, next-lesson card)

Make the pill always show a real lesson value:

- Compute a **lesson value** = `amount_due` if greater than 0, else `paid_amount` if greater than 0, else the pupil's rate for that duration (the card already has access to `custom_rate` / `custom_rate_90` / `custom_rate_120` fallbacks used elsewhere).
- **Paid** (fully settled, or prepaid/block with hours left): show the lesson value, pill stays green "Paid".
- **Partial**: no longer treated as fully paid. Show the remaining balance (`amount_due - paid_amount`) with an amber "Part paid" pill.
- **Unpaid / overdue**: unchanged — show `amount_due`, amber "Due" or red "Overdue".
- Never render `£0.00` when a lesson value can be derived.

## Technical notes

- Single file: `src/routes/home.tsx`, the block around lines 4914–4967 (`hAmountDue`, `hAmountPaid`, `isPaid`, `priceText`, `hLabelFinal`, `hPillBgFinal`, `hPillFgFinal`) plus the pill render around line 5199.
- No query, schema, or backend change needed — the fields are already selected at line 2736.
