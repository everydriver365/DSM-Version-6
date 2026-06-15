create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id),
  name text not null,
  phone text,
  email text,
  course_interest text,
  notes text,
  status text default 'new',
  created_at timestamptz default now()
);

alter table enquiries enable row level security;

create policy "Instructor sees own enquiries"
on enquiries for all
using (instructor_id = auth.uid());

grant select, insert, update, delete on public.enquiries to authenticated;
grant all on public.enquiries to service_role;
