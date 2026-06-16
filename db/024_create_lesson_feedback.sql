-- Run this in the Supabase SQL editor.

create table if not exists public.lesson_feedback (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons(id) on delete cascade,
  instructor_id uuid references auth.users(id) on delete cascade,
  topics_covered jsonb,
  progress_rating integer,
  instructor_notes text,
  pupil_feedback text,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.lesson_feedback to authenticated;
grant all on public.lesson_feedback to service_role;

alter table public.lesson_feedback enable row level security;

create policy "Instructor sees own feedback"
  on public.lesson_feedback for all to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());
