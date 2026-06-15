create table if not exists public.standards_checks (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  check_date date not null,
  grade text not null,
  examiner_name text,
  test_centre text,
  notes text,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.standards_checks to authenticated;
grant all on public.standards_checks to service_role;

alter table public.standards_checks enable row level security;

create policy "Instructor sees own standards checks"
  on public.standards_checks for all
  to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());
