create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id),
  pupil_id uuid references pupils(id),
  pupil_name text,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  created_at timestamptz default now()
);

alter table reviews enable row level security;

create policy "Instructor sees own reviews"
on reviews for all
using (instructor_id = auth.uid());

grant select, insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
