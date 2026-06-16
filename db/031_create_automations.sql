create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id),
  name text not null,
  trigger_type text not null,
  message_template text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.automations to authenticated;
grant all on public.automations to service_role;

alter table automations enable row level security;

create policy "Instructor sees own automations"
on automations for all
using (instructor_id = auth.uid());
