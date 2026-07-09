-- One-time data repair — 2026-07-09
--
-- Historic bug: the payment flow was overwriting `lessons.amount_due` (setting
-- it to 0 on full payment, or reducing it on partial payment). That corrupted
-- the "committed revenue" figure, which now derives from amount_due directly.
--
-- The code has since been fixed so that payment flows only write
-- payment_status, paid_amount, paid_at — never amount_due. This script
-- back-fills the rows that were damaged by the old code.
--
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).

-- 1) Rows where amount_due was zeroed but paid_amount holds the real value.
update public.lessons
set amount_due = paid_amount
where payment_status in ('paid', 'partial')
  and (amount_due = 0 or amount_due is null)
  and paid_amount is not null
  and paid_amount > 0
  and deleted_at is null;

-- 2) Rows where payment_status is 'paid' but paid_amount was never written.
update public.lessons
set paid_amount = amount_due,
    paid_at     = coalesce(paid_at, updated_at, created_at)
where payment_status = 'paid'
  and paid_amount is null
  and amount_due is not null
  and amount_due > 0
  and deleted_at is null;
