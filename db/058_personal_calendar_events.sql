-- Personal (private) events created inside DSM, stored alongside imported
-- external calendar events in public.calendar_blocks with source = 'personal'.

create table if not exists public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  title text,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  source text default 'personal',
  created_at timestamptz default now()
);

alter table public.calendar_blocks add column if not exists is_all_day boolean default false;
alter table public.calendar_blocks add column if not exists location text;
alter table public.calendar_blocks add column if not exists notes text;
alter table public.calendar_blocks add column if not exists colour text;
alter table public.calendar_blocks add column if not exists blocks_availability boolean default true;
alter table public.calendar_blocks add column if not exists recurrence_group_id uuid;

grant select, insert, update, delete on public.calendar_blocks to authenticated;
grant all on public.calendar_blocks to service_role;

alter table public.calendar_blocks enable row level security;

drop policy if exists "Instructor manages own calendar blocks" on public.calendar_blocks;
create policy "Instructor manages own calendar blocks"
on public.calendar_blocks for all
to authenticated
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());

create index if not exists calendar_blocks_instructor_start_idx
  on public.calendar_blocks (instructor_id, start_datetime);
