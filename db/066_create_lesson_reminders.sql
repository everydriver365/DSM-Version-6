-- Per-lesson reminders. Run in the Supabase SQL editor.

create table if not exists public.lesson_reminders (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  instructor_id uuid references auth.users(id) on delete cascade not null,
  minutes_before integer not null default 60,
  enabled boolean not null default true,
  sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (lesson_id)
);

grant select, insert, update, delete on public.lesson_reminders to authenticated;
grant all on public.lesson_reminders to service_role;

alter table public.lesson_reminders enable row level security;

drop policy if exists "Instructor manages own lesson reminders" on public.lesson_reminders;
create policy "Instructor manages own lesson reminders"
on public.lesson_reminders for all
to authenticated
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());

create index if not exists lesson_reminders_due_idx
  on public.lesson_reminders (enabled, sent_at);
