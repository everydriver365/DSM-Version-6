-- Instructor courses (course builder / marketplace listings)
create table if not exists public.instructor_courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  course_type text not null,
  name text not null,
  total_hours numeric not null,
  includes_test boolean default false,
  description text,
  max_spaces integer default 1,
  spaces_taken integer default 0,
  start_date date,
  end_date date,
  daily_hours numeric,
  repeat_type text default 'one-off',
  pickup_area text,
  lesson_time_preference text default 'flexible',
  price numeric not null,
  deposit_amount numeric default 0,
  deposit_only_to_book boolean default false,
  early_bird_discount numeric default 0,
  early_bird_expiry date,
  publish_marketplace boolean default true,
  publish_mini_website boolean default true,
  status text default 'active',
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.instructor_courses to authenticated;
grant all on public.instructor_courses to service_role;

alter table public.instructor_courses enable row level security;

drop policy if exists "Instructor manages own courses" on public.instructor_courses;
create policy "Instructor manages own courses"
  on public.instructor_courses for all
  to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());

create index if not exists instructor_courses_instructor_idx
  on public.instructor_courses (instructor_id, created_at desc);
