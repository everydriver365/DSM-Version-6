-- Run this in the Supabase SQL editor.

create table if not exists public.waiver_templates (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  name text not null,
  content text not null,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.waiver_templates to authenticated;
grant all on public.waiver_templates to service_role;

alter table public.waiver_templates enable row level security;

create policy "Instructor sees own templates"
  on public.waiver_templates for all to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());

create table if not exists public.waiver_signatures (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  template_id uuid references public.waiver_templates(id) on delete cascade,
  pupil_id uuid references public.pupils(id) on delete set null,
  pupil_name text,
  status text default 'pending',
  signed_at timestamptz,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.waiver_signatures to authenticated;
grant all on public.waiver_signatures to service_role;

alter table public.waiver_signatures enable row level security;

create policy "Instructor sees own signatures"
  on public.waiver_signatures for all to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());
