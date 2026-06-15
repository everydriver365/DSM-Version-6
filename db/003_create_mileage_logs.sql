-- Run in the Supabase SQL editor of the EDDSM_NEW_June26 project.

create table if not exists public.mileage_logs (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  trip_date date default current_date,
  description text,
  miles numeric not null,
  purpose text default 'business',
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.mileage_logs to authenticated;
grant all on public.mileage_logs to service_role;

alter table public.mileage_logs enable row level security;

drop policy if exists "Instructor sees own mileage" on public.mileage_logs;
create policy "Instructor sees own mileage"
on public.mileage_logs for all
to authenticated
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());
