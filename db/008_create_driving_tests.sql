create table if not exists driving_tests (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id),
  pupil_id uuid references pupils(id),
  test_date date not null,
  test_time time,
  test_centre text,
  result text,
  faults integer,
  result_notes text,
  result_logged_at timestamptz,
  created_at timestamptz default now()
);

alter table driving_tests enable row level security;

create policy "Instructor sees own tests"
on driving_tests for all
using (instructor_id = auth.uid());

grant select, insert, update, delete on public.driving_tests to authenticated;
grant all on public.driving_tests to service_role;
