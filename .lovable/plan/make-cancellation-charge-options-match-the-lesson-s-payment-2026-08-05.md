# Make cancellation charge options match the lesson's payment state

Right now the three cancel flows offer the same charge choices regardless of how the lesson was paid, and the confirm button only checks that a reason was picked. That lets you confirm a cancellation that can't actually be carried out — for example charging a fee with the amount box left empty, or charging a fee larger than the lesson value.

## What changes

**Charge options adapt to the payment state**

- Paid / part-paid: all three options — No charge (refund what was paid), Charge a fee (remainder refunded), Charge full lesson.
- Prepaid (block / intensive): No charge (returns the hour to the pupil's package) and Charge a fee (the hour is consumed instead of returned). "Charge full lesson" is hidden — there is no cash payment to retain.
- Unpaid: No charge and Charge a fee (the fee becomes the new amount owed). No refund wording is shown anywhere, because nothing was paid.

**The fee input behaves properly**

- It only appears when "Charge a fee" is selected, and it is capped at the lesson value; typing more clamps it with an inline note.
- Empty or zero fee blocks confirmation with the message "Enter a fee amount".
- On paid/part-paid lessons it shows the live split ("£15 retained · £20 refunded"); on unpaid it shows "£15 will be owed"; on prepaid it shows "hour will be consumed".

**Confirm button reflects all of that**

Disabled until a reason is chosen AND the selected charge option is valid for the payment state and has a usable amount. The button label states the outcome: "Cancel & refund £20", "Cancel & charge £15", "Cancel lesson".

**Consistent side effects**

- Selecting a fee on an unpaid lesson writes the fee to the lesson's amount due (today only the policy sheet does this).
- Prepaid hour return on "No charge" runs in all three flows (today only the edit page does it).
- The summary panel and the audit note wording follow the same payment-state rules, so what you confirm is what gets recorded.

## Technical notes

- New shared helper `src/lib/cancelCharge.ts`:
  - `availableChargeOptions(paymentStatus)` returning the allowed `"none" | "fee" | "full"` set.
  - `describeChargeOption(option, { paymentStatus, amountDue, fee })` returning `{ subtitle, outcomeText, valid, error }` — one source of truth for the option subtitles, the summary panel text, the audit-row outcome string and the disabled state.
  - `clampFee(value, amountDue)`.
- Wire the helper into `src/components/lessons/LessonActionsSheet.tsx` (inline cancel view), `src/routes/lessons.edit.$id.tsx` (cancel section) and `src/components/lessons/CancelSummaryPanel.tsx`; the policy-driven `CancelLessonSheet.tsx` reuses the same outcome/`amount_due` rules so its wording matches.
- When the payment status changes or the sheet re-opens, reset `chargeOption` to a value present in `availableChargeOptions` so a stale "full" selection can't survive on a prepaid or unpaid lesson.
- Existing deferred-commit undo flow (`src/lib/cancelLesson.ts`) is untouched; only the values passed into `financials()` change.
