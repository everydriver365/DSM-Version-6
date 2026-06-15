create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  name text not null,
  doc_type text not null default 'other',
  expiry_date date,
  notes text,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;

alter table public.documents enable row level security;

create policy "Instructor sees own documents"
  on public.documents for all
  to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());
