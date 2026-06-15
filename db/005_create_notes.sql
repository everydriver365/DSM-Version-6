create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  title text default '',
  body text default '',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.notes to authenticated;
grant all on public.notes to service_role;

alter table public.notes enable row level security;

create policy "Instructor sees own notes"
on public.notes for all
to authenticated
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());
