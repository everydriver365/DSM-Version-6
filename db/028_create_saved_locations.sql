-- Saved locations for instructors (pickup spots, test centres, car parks, etc.)
create table if not exists public.saved_locations (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  name text not null,
  postcode text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.saved_locations to authenticated;
grant all on public.saved_locations to service_role;

alter table public.saved_locations enable row level security;

drop policy if exists "Instructor sees own locations" on public.saved_locations;
create policy "Instructor sees own locations"
on public.saved_locations
for all
to authenticated
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());
