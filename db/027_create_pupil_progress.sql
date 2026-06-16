create table if not exists public.pupil_progress (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id),
  pupil_id uuid references public.pupils(id) on delete cascade,
  item_key text not null,
  status text default 'not_started',
  updated_at timestamptz default now(),
  unique(pupil_id, item_key)
);

grant select, insert, update, delete on public.pupil_progress to authenticated;
grant all on public.pupil_progress to service_role;

alter table public.pupil_progress enable row level security;

create policy "Instructor sees own pupil progress"
on public.pupil_progress for all
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());
