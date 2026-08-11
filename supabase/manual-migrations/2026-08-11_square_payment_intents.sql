-- Square hosted-checkout payments: pending intents + webhook settlement.
--
-- Why this exists
-- ---------------
-- Generating a Square payment link does NOT mean the pupil paid. Until this
-- migration the app had no record of "link sent, waiting for the pupil", and
-- nothing settled the ledger when the pupil actually paid.
--
-- Flow:
--   1. Instructor generates a Square link/QR  -> row inserted here, status 'pending'
--   2. Pupil pays on Square's hosted checkout
--   3. Square calls /api/public/square-webhook
--   4. The webhook calls apply_square_payment(), which settles the ledger
--      exactly like src/lib/payments.ts recordPayment() does client-side.
--
-- Run this in the Supabase SQL editor.

create table if not exists public.square_payment_intents (
  id               uuid primary key default gen_random_uuid(),
  instructor_id    uuid not null references auth.users(id) on delete cascade,
  pupil_id         uuid references public.pupils(id) on delete set null,
  lesson_id        uuid,
  amount_pence     integer not null check (amount_pence > 0),
  description      text,
  -- Identifiers returned by square-create-payment-link / sent by the webhook.
  payment_link_id  text,
  order_id         text,
  square_payment_id text,
  checkout_url     text,
  status           text not null default 'pending'
                     check (status in ('pending', 'paid', 'failed', 'cancelled')),
  created_at       timestamptz not null default now(),
  paid_at          timestamptz
);

create index if not exists square_payment_intents_instructor_idx
  on public.square_payment_intents (instructor_id, status, created_at desc);
create index if not exists square_payment_intents_link_idx
  on public.square_payment_intents (payment_link_id);
create index if not exists square_payment_intents_order_idx
  on public.square_payment_intents (order_id);

grant select, insert, update on public.square_payment_intents to authenticated;
grant all on public.square_payment_intents to service_role;

alter table public.square_payment_intents enable row level security;

drop policy if exists "instructors read own square intents" on public.square_payment_intents;
create policy "instructors read own square intents"
  on public.square_payment_intents for select to authenticated
  using (auth.uid() = instructor_id);

drop policy if exists "instructors create own square intents" on public.square_payment_intents;
create policy "instructors create own square intents"
  on public.square_payment_intents for insert to authenticated
  with check (auth.uid() = instructor_id);

drop policy if exists "instructors update own square intents" on public.square_payment_intents;
create policy "instructors update own square intents"
  on public.square_payment_intents for update to authenticated
  using (auth.uid() = instructor_id)
  with check (auth.uid() = instructor_id);

-- ---------------------------------------------------------------------------
-- apply_square_payment(): settle a paid intent into the ledger.
--
-- Mirrors src/lib/payments.ts recordPayment():
--   * FIFO allocation across unpaid lessons by lesson_date
--   * overpayment -> pupils.account_balance
--   * lesson_history audit row
--   * legacy payments row
--   * instructor_notifications "Payment received"
-- Idempotent: a second call for an already-paid intent is a no-op.
-- ---------------------------------------------------------------------------
create or replace function public.apply_square_payment(
  p_intent_id        uuid,
  p_square_payment_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v            public.square_payment_intents%rowtype;
  v_amount     numeric;
  v_remaining  numeric;
  v_now        timestamptz := now();
  v_lesson     record;
  v_due        numeric;
  v_over       numeric;
  v_pupil_name text;
begin
  select * into v from public.square_payment_intents where id = p_intent_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'intent_not_found');
  end if;
  if v.status = 'paid' then
    return jsonb_build_object('ok', true, 'reason', 'already_paid');
  end if;

  v_amount    := v.amount_pence::numeric / 100;
  v_remaining := v_amount;

  if v.pupil_id is not null then
    -- Targeted lesson first, then FIFO over the remaining unpaid lessons.
    if v.lesson_id is not null then
      select id, coalesce(amount_due, 0) as amount_due into v_lesson
      from public.lessons where id = v.lesson_id;
      if found then
        v_due := v_lesson.amount_due;
        if v_due > 0 and v_remaining > 0 then
          update public.lessons
             set payment_status = case when v_remaining >= v_due then 'paid' else 'partial' end,
                 payment_method = 'card_square',
                 paid_at        = v_now,
                 paid_amount    = least(v_due, v_remaining)
           where id = v.lesson_id;
          v_remaining := v_remaining - least(v_due, v_remaining);
        end if;
      end if;
    end if;

    for v_lesson in
      select id, coalesce(amount_due, 0) as amount_due
        from public.lessons
       where pupil_id = v.pupil_id
         and payment_status = 'unpaid'
         and deleted_at is null
         and (v.lesson_id is null or id <> v.lesson_id)
       order by lesson_date asc
    loop
      exit when v_remaining <= 0;
      v_due := v_lesson.amount_due;
      continue when v_due <= 0;
      if v_due <= v_remaining then
        update public.lessons
           set payment_status = 'paid', payment_method = 'card_square',
               paid_at = v_now, paid_amount = v_due
         where id = v_lesson.id;
        v_remaining := v_remaining - v_due;
      else
        update public.lessons
           set payment_status = 'partial', payment_method = 'card_square',
               paid_at = v_now, paid_amount = v_remaining
         where id = v_lesson.id;
        v_remaining := 0;
      end if;
    end loop;

    v_over := v_remaining;
    if v_over > 0 then
      update public.pupils
         set account_balance = coalesce(account_balance, 0) + v_over
       where id = v.pupil_id;
    end if;

    select name into v_pupil_name from public.pupils where id = v.pupil_id;
  end if;

  insert into public.lesson_history
    (instructor_id, pupil_id, lesson_cost, payment_status, payment_method, notes, created_at)
  values
    (v.instructor_id, v.pupil_id, v_amount, 'paid', 'card_square',
     nullif(trim(coalesce(v.description, '')), ''), v_now);

  insert into public.payments (instructor_id, pupil_id, amount, notes, paid_at, created_at)
  values (v.instructor_id, v.pupil_id, v_amount, 'card_square', v_now, v_now);

  insert into public.instructor_notifications
    (instructor_id, title, body, type, read, reference_type)
  values
    (v.instructor_id, 'Payment received',
     '£' || to_char(v_amount, 'FM999999990.00') || ' card payment from ' ||
       coalesce(nullif(trim(coalesce(v_pupil_name, '')), ''), 'a pupil'),
     'payment_received', false, 'payment');

  update public.square_payment_intents
     set status = 'paid',
         paid_at = v_now,
         square_payment_id = coalesce(p_square_payment_id, square_payment_id)
   where id = v.id;

  return jsonb_build_object('ok', true, 'amount', v_amount, 'pupil_id', v.pupil_id);
end;
$$;

revoke all on function public.apply_square_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.apply_square_payment(uuid, text) to service_role;
