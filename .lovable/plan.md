# Fix AI Insight showing prepaid pupils as owing

**File touched:** `src/routes/home.tsx` only.

## The bug

In `home.tsx` at lines 3836–3843, the AI Insight card computes `owedPupil` by scanning today/tomorrow lessons and flagging any lesson with `amount_due > 0` that isn't marked `paid`:

```ts
const owedPupil = (() => {
  for (const l of sorted) {
    const amt = Number(l.amount_due ?? 0);
    const paid = (l.payment_status ?? '').toLowerCase() === 'paid';
    if (amt > 0 && !paid) return { name: ..., amount: amt, phone: ... };
  }
  return null;
})();
```

That ignores:
- `payment_status === 'prepaid'`
- the pupil's `prepaid_hours` balance
- any account credit

So a fully prepaid pupil (Sabrina) still gets a "£80 owed" insight.

## Note on "Smart Business Card"

There is no separate component named that in `home.tsx`. The AI Insight card built at lines 3844–3856 is the only outstanding-state surface in this file. Fixing `owedPupil` fixes both the text and the "Remind" action.

The good news: the pre-computed `outstandingBreakdown` state (lines 1950–2014) already filters out prepaid pupils via `prepaidPupilIds`. We can source the insight from it directly.

## Change

Replace the `owedPupil` IIFE (lines 3836–3843) with one that:

1. Prefers the first row of `outstandingBreakdown` (already excludes prepaid pupils and nets to a real amount).
2. Falls back to scanning `sorted` lessons but skips any lesson whose pupil has `prepaid_hours > 0` or whose `payment_status` is `prepaid`.

Shape:

```ts
const owedPupil = (() => {
  // Prefer the already-filtered outstanding breakdown (prepaid pupils removed upstream)
  const top = outstandingBreakdown[0];
  if (top && top.amount > 0) {
    return {
      id: top.pupilId,
      name: top.firstName || top.name.split(' ')[0],
      amount: top.amount,
      phone: top.phone ?? '',
    };
  }
  // Fallback: scan today's lessons but skip prepaid pupils / prepaid lessons
  for (const l of sorted) {
    const amt = Number(l.amount_due ?? 0);
    const status = (l.payment_status ?? '').toLowerCase();
    const prepaidPupil = Number((l.pupils as any)?.prepaid_hours ?? 0) > 0;
    if (amt > 0 && status !== 'paid' && status !== 'prepaid' && !prepaidPupil) {
      return {
        id: l.pupil_id,
        name: (l.pupils?.first_name ?? pupilName(l)).split(' ')[0],
        amount: amt,
        phone: l.pupils?.phone ?? '',
      };
    }
  }
  return null;
})();
```

The downstream `else if (owedPupil)` block (lines 3847–3856) already reads `owedPupil.name`, `.amount`, `.phone` — no changes needed there. The insight simply won't render for prepaid pupils because `owedPupil` will be `null`.

## Out of scope

- No changes to `outstandingBreakdown` (already correct).
- No changes outside `home.tsx`.
- No changes to schedule tiles or the £-pill logic (already handled in the prior fix).
