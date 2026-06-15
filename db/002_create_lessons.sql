-- Run in the Supabase SQL editor of the EDDSM_NEW_June26 project.

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  pupil_id uuid references public.pupils(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes integer default 60,
  status text default 'confirmed',
  notes text,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.lessons to authenticated;
grant all on public.lessons to service_role;

alter table public.lessons enable row level security;

drop policy if exists "Instructor sees own lessons" on public.lessons;
create policy "Instructor sees own lessons"
on public.lessons for all
to authenticated
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());

create index if not exists lessons_instructor_scheduled_idx
  on public.lessons (instructor_id, scheduled_at);
