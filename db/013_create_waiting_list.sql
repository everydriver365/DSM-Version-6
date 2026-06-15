-- Waiting list
create table if not exists waiting_list (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id),
  name text not null,
  phone text,
  email text,
  course_interest text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.waiting_list to authenticated;
grant all on public.waiting_list to service_role;

alter table waiting_list enable row level security;

drop policy if exists "Instructor sees own waiting list" on waiting_list;
create policy "Instructor sees own waiting list"
on waiting_list for all
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());
