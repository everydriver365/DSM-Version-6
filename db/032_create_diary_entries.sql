create table if not exists diary_entries (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id),
  title text not null,
  body text,
  entry_date date not null,
  entry_type text default 'note',
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.diary_entries to authenticated;
grant all on public.diary_entries to service_role;

alter table diary_entries enable row level security;

create policy "Instructor sees own diary"
on diary_entries for all
using (instructor_id = auth.uid());
