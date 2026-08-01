# Why Lara's balance says £1230 — and how to stop it

You're right: nobody typed 1230. It's an accumulated value. `pupils.account_balance` is a running number that several unrelated code paths add to, with no ledger row proving each change.

## What the live data shows

Confirmed by querying her records just now:

- `account_balance` = 1230, `prepaid_hours` = 15, `prepaid_amount_paid` = 645
- `payments` table: exactly **one** row — £665, today 12:54
- `lesson_history`: one row, `lesson_cost` 0, bank transfer, today 12:54
- 7 lessons total. All the older ones are `payment_status = prepaid`. Three of them were cancelled or deleted: £120 (cancelled 27 Jul), £120 (deleted 25 Jul), £80 (deleted 31 Jul) = **£320**

## How the number grows without anyone entering it

Five separate places write `account_balance`, each with `read → add → write`:

- `CancelLessonSheet.tsx` — cancelling a lesson credits its full `amount_due` back
- `schedule.tsx` — cancelling a prepaid lesson credits `amount_due` back
- `home.tsx` — deleting an earnings/payment record restores credit
- `TakePaymentSheet.tsx` / `take-payment.tsx` / `lib/payments.ts` — any overpayment becomes credit
- `pupils.new.tsx` — an opening amount at pupil creation

Two of these compound for her:

1. **Prepaid-package lessons refund cash credit when cancelled.** Her cancelled/deleted lessons were paid out of the 15-hour package, not out of cash credit — but the cancel/delete handlers still add `amount_due` to `account_balance`. That's £320 of credit created from lessons that were never separately paid for.
2. **No audit trail existed.** Until the fix earlier today, every `payments` insert was silently failing (wrong column names, errors only `console.error`'d). So credit was added repeatedly while zero payment rows landed. That's why one £665 row sits under a £1230 balance.

The exact split of the remaining ~£565 can't be reconstructed — those writes left no record anywhere. That is the real problem, not the number itself.

## The fix

**1. Stop cancel/delete from minting credit for package-funded lessons**

In `CancelLessonSheet.tsx` and the cancel path in `schedule.tsx`: only credit `account_balance` when the lesson was actually paid with cash/card (`payment_status = 'paid'` with a real `paid_amount`). When it was covered by prepaid hours, return the **hours** to `prepaid_hours` instead of adding money to the balance.

**2. Make every balance change leave a record**

Introduce a single helper (`src/lib/accountBalance.ts`) that all six call sites use. It writes the `payments`/adjustment row first, then updates `account_balance`, and surfaces failures via a toast rather than swallowing them. No direct `pupils.update({ account_balance })` anywhere else.

**3. Show the working on the profile**

On the pupil profile, make the Balance figure tappable, opening a breakdown sheet: payments received, prepaid package, credits from cancellations, lessons consumed. Then a wrong number is diagnosable in-app instead of by database query.

**4. Correct Lara's balance**

Once the leaks are closed, set her `account_balance` to a value you confirm is right, recorded as a visible manual adjustment row rather than a silent overwrite.

## Technical notes

- Files touched: `src/components/lessons/CancelLessonSheet.tsx`, `src/routes/schedule.tsx`, `src/routes/home.tsx` (earnings delete), `src/lib/payments.ts`, `src/components/payments/TakePaymentSheet.tsx`, `src/routes/take-payment.tsx`, `src/routes/pupils.$id.tsx`, plus new `src/lib/accountBalance.ts`.
- The read-add-write pattern is also racy; the helper centralises it so it can later become a single atomic RPC.
- No schema change is required for steps 1–3; step 4 is a data correction only.

Tell me if you'd rather I do step 1 alone first (stop the bleeding), or the whole set.
