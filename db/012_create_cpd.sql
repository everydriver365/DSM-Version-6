-- CPD log entries
create table if not exists cpd_entries (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id),
  title text not null,
  category text default 'training',
  hours numeric not null,
  entry_date date default current_date,
  description text,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.cpd_entries to authenticated;
grant all on public.cpd_entries to service_role;

alter table cpd_entries enable row level security;

drop policy if exists "Instructor sees own CPD" on cpd_entries;
create policy "Instructor sees own CPD"
on cpd_entries for all
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());
