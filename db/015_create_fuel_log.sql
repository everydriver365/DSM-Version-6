-- Fuel log entries
create table if not exists public.fuel_log (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  fill_date date default current_date,
  litres numeric not null,
  pence_per_litre numeric not null,
  total_cost numeric not null,
  mileage_at_fill integer,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.fuel_log to authenticated;
grant all on public.fuel_log to service_role;

alter table public.fuel_log enable row level security;

drop policy if exists "Instructor sees own fuel log" on public.fuel_log;
create policy "Instructor sees own fuel log"
on public.fuel_log for all
to authenticated
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());

create index if not exists fuel_log_instructor_date_idx
  on public.fuel_log (instructor_id, fill_date desc);
