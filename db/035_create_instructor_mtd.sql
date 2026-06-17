-- Instructor MTD (Making Tax Digital) status
create table if not exists public.instructor_mtd (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade unique,
  is_enrolled boolean default false,
  mtd_start_date date,
  hmrc_reference text,
  q1_submitted boolean default false,
  q2_submitted boolean default false,
  q3_submitted boolean default false,
  q4_submitted boolean default false,
  updated_at timestamptz default now()
);

grant select, insert, update, delete on public.instructor_mtd to authenticated;
grant all on public.instructor_mtd to service_role;

alter table public.instructor_mtd enable row level security;

drop policy if exists "Instructor manages own MTD" on public.instructor_mtd;
create policy "Instructor manages own MTD"
  on public.instructor_mtd for all
  to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());
