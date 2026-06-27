## Investigate "Payment could not be completed" on quote deposit

The deposit pay flow in `src/routes/quote.$token.tsx` calls `create-ryft-payment` then mounts Ryft. The generic "Payment could not be completed. Please try again." is likely coming from Ryft's `paymentError` handler after `attemptPayment()`.

Before changing code I need a few facts:

### Questions
1. Did the error appear **immediately on opening the form** (init failure), **after clicking Pay** (attemptPayment failure), or **after entering card details**?
2. Is `create-ryft-payment` returning OK (clientSecret) — any 4xx/5xx in network tab?
3. Is the Ryft account in **sandbox or live** mode, and does the public key (`pk_sandbox_...`) match?

### Likely root causes
- **Sandbox key vs live env mismatch** — the hardcoded `RYFT_PUBLIC_KEY` in `quote.$token.tsx` is `pk_sandbox_...`. If the edge function `create-ryft-payment` is using a **live** secret key (or vice versa), Ryft rejects with a generic error. Same fix applies as the take-payment screen.
- **Card form not actually mounted** — current code calls `Ryft.init()` and mounts Google/Apple Pay but never mounts the **card form** (`Ryft.cardForm.mount('#ryft-pay-form')` or similar). `attemptPayment()` then fails because there are no card fields collected. The `take-payment.tsx` and `pay.tsx` screens were updated previously to add this mount call — this route was missed.
- **Amount below 3p minimum** — Ryft requires ≥ 3 pence. If `deposit_amount` is very small this fails. Should add the same min-3p guard used in take-payment.

### Proposed fix (once confirmed)
Only edit `src/routes/quote.$token.tsx`:
1. Add a `<div id="ryft-card-form">` inside the form and mount the Ryft card element after `Ryft.init()` (matching the pattern already used in `pay.tsx`/`take-payment.tsx`).
2. Surface the actual Ryft error code/message in `payError` instead of swallowing it — log `evt` from `paymentError` to console so we can see the real reason next time.
3. Guard against deposits < £0.03.

Please answer Q1–Q3 (or paste the browser console output around the failed payment) so I can target the right cause rather than guessing.
