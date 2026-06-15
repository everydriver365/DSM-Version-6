-- Run this in the Supabase SQL editor for the EDDSM_NEW_June26 project.

create table if not exists public.pupils (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  lesson_count integer default 0,
  balance_owed numeric default 0,
  status text default 'active',
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.pupils to authenticated;
grant all on public.pupils to service_role;

alter table public.pupils enable row level security;

create policy "Instructors can view their own pupils"
  on public.pupils for select to authenticated
  using (auth.uid() = instructor_id);

create policy "Instructors can insert their own pupils"
  on public.pupils for insert to authenticated
  with check (auth.uid() = instructor_id);

create policy "Instructors can update their own pupils"
  on public.pupils for update to authenticated
  using (auth.uid() = instructor_id)
  with check (auth.uid() = instructor_id);

create policy "Instructors can delete their own pupils"
  on public.pupils for delete to authenticated
  using (auth.uid() = instructor_id);
