-- Create mock test results table
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent for `IF NOT EXISTS` where supported,
-- but the CREATE TABLE and POLICY statements here assume a fresh migration).

create table public.mock_test_results (
  id uuid primary key default gen_random_uuid(),
  pupil_id uuid not null references public.pupils(id) on delete cascade,
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  test_date date not null,
  result text, -- 'Passed' | 'Failed'
  minor_faults integer,
  serious_faults integer,
  dangerous_faults integer,
  fault_marks jsonb,
  notes text,
  created_at timestamp with time zone default now()
);

-- Data API access: instructors own their own rows; service_role for edge functions/admin.
grant select, insert, update, delete on public.mock_test_results to authenticated;
grant all on public.mock_test_results to service_role;

alter table public.mock_test_results enable row level security;

create policy "Instructors manage their own mock test results"
  on public.mock_test_results for all
  to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());
