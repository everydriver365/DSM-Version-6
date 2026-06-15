create table if not exists public.health_logs (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  water_glasses integer not null default 0,
  mood integer,
  steps integer,
  breaks_taken integer not null default 0,
  updated_at timestamptz default now(),
  unique (instructor_id, log_date)
);

grant select, insert, update, delete on public.health_logs to authenticated;
grant all on public.health_logs to service_role;

alter table public.health_logs enable row level security;

create policy "Instructor sees own health logs"
  on public.health_logs for all
  to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());
