create table if not exists public.pipeline_leads (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  course_interest text,
  source text default 'other',
  stage text default 'new',
  notes text,
  stage_updated_at timestamptz default now(),
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.pipeline_leads to authenticated;
grant all on public.pipeline_leads to service_role;

alter table public.pipeline_leads enable row level security;

create policy "Instructor sees own pipeline"
  on public.pipeline_leads for all
  to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());

create index if not exists pipeline_leads_instructor_stage_idx
  on public.pipeline_leads (instructor_id, stage, stage_updated_at desc);
