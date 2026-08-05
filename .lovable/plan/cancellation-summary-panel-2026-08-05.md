# Cancellation Summary Panel

## Goal
Add a clear, read-only summary panel before the final “Confirm cancellation” action in every cancellation flow. The panel must show the selected reason, any notes, and the exact charge/refund outcome (including prepaid-hour returns, account-credit refunds, and retained fees).

## Where to change
- `src/components/lessons/LessonActionsSheet.tsx` — inline cancel view
- `src/routes/lessons.edit.$id.tsx` — cancel section inside the edit lesson form
- `src/components/lessons/CancelLessonSheet.tsx` — dedicated cancellation sheet

## What to build

1. **New reusable component** `src/components/lessons/CancelSummaryPanel.tsx`
   - Props:
     - `reason: string`
     - `notes?: string`
     - `chargeOption: "none" | "fee" | "full"`
     - `cancelFee?: number` (only for "fee")
     - `amountDue: number`
     - `paymentStatus: "paid" | "partial" | "prepaid" | "unpaid" | string | null`
     - `prepaidHours?: number` (optional, to show “X hours remain” if known)
   - Render a compact card with DSM flat styling:
     - 1px `#E4E8EF` border, 10px radius, `#F8FAFC` background, 12px padding
     - Section title: “Cancellation summary” (Poppins 600, 13px, `#0B1F3A`)
     - Row: Reason — selected reason text
     - Row: Notes — notes text or “None”
     - Row: Outcome — exact financial outcome as a sentence
   - Outcome rules (matching the existing logic):
     - `chargeOption === "none"`:
       - `paid` / `partial` → “£{amountDue} refunded as account credit”
       - `prepaid` → “1 lesson returned to prepaid hours”
       - otherwise → “No payment to refund”
     - `chargeOption === "fee"`:
       - refund = amountDue - cancelFee
       - If refund > 0 → “£{fee} cancellation fee retained; £{refund} refunded as account credit”
       - If refund <= 0 → “£{fee} cancellation fee retained; no refund due”
     - `chargeOption === "full"`:
       - “£{amountDue} full lesson charge retained; no refund”

2. **Integrate in `LessonActionsSheet.tsx`**
   - Insert `<CancelSummaryPanel />` between the charge options stack and the red “Confirm cancellation” button.
   - Only render the panel when a `cancelReason` is selected.
   - Keep existing state and confirm handler unchanged.

3. **Integrate in `lessons.edit.$id.tsx`**
   - Insert the same `<CancelSummaryPanel />` between the charge options stack and the “Confirm cancellation” button.
   - Only render when a `cancelReason` is selected.
   - Keep existing Google Calendar sync, prepaid-hour return, and refund handlers unchanged.

4. **Integrate in `CancelLessonSheet.tsx`**
   - This sheet already has a policy-based charge box. Add the summary panel below it (or merge into it) so the reason, notes, and final charge decision are visible before the action buttons.
   - Use the same component, mapping the current policy outcome to the `chargeOption` prop equivalent:
     - `chargeAmount > 0` → `chargeOption="fee"` with `cancelFee={chargeAmount}`
     - waive charge / cancel without charge → `chargeOption="none"`

## Styling rules
- Follow DSM flat design: no shadows, 1px borders, 10px border radius, Poppins for labels, Inter for secondary text.
- Colors: `#0B1F3A` (navy text), `#6B7686` (muted text), `#CC2229` (negative outcome), `#16A34A` (refund/positive outcome), `#E4E8EF` (borders).

## Out-of-scope
- No changes to the actual cancellation Supabase writes, refund logic, or Google Calendar sync.
- No changes to the list of cancellation reasons or the charge-option UX.

## Verification
- TypeScript check passes.
- Visual check in the cancellation flow for each of the three sheets shows the summary panel with reason, notes, and exact outcome before the confirm button is tapped.