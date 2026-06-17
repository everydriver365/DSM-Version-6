create table if not exists public.sms_queue (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  pupil_phone text not null,
  message text not null,
  status text default 'queued',
  scheduled_for timestamptz default now(),
  sent_at timestamptz,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.sms_queue to authenticated;
grant all on public.sms_queue to service_role;

alter table public.sms_queue enable row level security;

drop policy if exists "Instructor sees own sms queue" on public.sms_queue;
create policy "Instructor sees own sms queue"
  on public.sms_queue for all
  to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());

create index if not exists sms_queue_instructor_idx
  on public.sms_queue (instructor_id, scheduled_for desc);
