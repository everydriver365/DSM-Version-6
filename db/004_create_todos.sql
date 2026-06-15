create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  title text not null,
  due_date date,
  priority text default 'medium',
  completed boolean default false,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.todos to authenticated;
grant all on public.todos to service_role;

alter table todos enable row level security;

create policy "Instructor sees own todos"
on todos for all
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());
