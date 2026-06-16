create table if not exists certifications (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id),
  name text not null,
  cert_type text default 'other',
  issued_by text,
  issue_date date,
  expiry_date date,
  cert_number text,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.certifications to authenticated;
grant all on public.certifications to service_role;

alter table certifications enable row level security;

create policy "Instructor sees own certifications"
on certifications for all
using (instructor_id = auth.uid());
