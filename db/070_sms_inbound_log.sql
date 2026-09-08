-- Log of every inbound SMS received by the Twilio webhook, so a lost reply
-- (e.g. a gap-filler YES) can be traced end to end.

create table if not exists public.sms_inbound_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  instructor_id uuid,
  pupil_id uuid,
  from_number text,
  message_sid text,
  body text,
  outcome text not null,
  detail text
);

grant select on public.sms_inbound_log to authenticated;
grant all on public.sms_inbound_log to service_role;

alter table public.sms_inbound_log enable row level security;

-- Instructors read their own rows. Rows with no instructor match (unknown
-- sender) carry no pupil or account data and are readable by any signed-in
-- instructor so a mis-matched number can still be spotted.
drop policy if exists "Instructor reads own inbound sms log" on public.sms_inbound_log;
create policy "Instructor reads own inbound sms log"
  on public.sms_inbound_log for select
  to authenticated
  using (instructor_id = auth.uid() or instructor_id is null);

create index if not exists sms_inbound_log_created_idx
  on public.sms_inbound_log (created_at desc);

create index if not exists sms_inbound_log_instructor_idx
  on public.sms_inbound_log (instructor_id, created_at desc);
