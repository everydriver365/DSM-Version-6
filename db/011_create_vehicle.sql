create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) unique,
  make text,
  model text,
  year integer,
  registration text,
  colour text,
  fuel_type text,
  transmission text,
  mileage integer,
  updated_at timestamptz default now()
);

create table if not exists vehicle_reminders (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id),
  reminder_type text not null,
  due_date date,
  notes text,
  created_at timestamptz default now()
);

alter table vehicles enable row level security;
alter table vehicle_reminders enable row level security;

create policy "Instructor manages own vehicle" on vehicles for all using (instructor_id = auth.uid());
create policy "Instructor manages own reminders" on vehicle_reminders for all using (instructor_id = auth.uid());

grant select, insert, update, delete on public.vehicles to authenticated;
grant all on public.vehicles to service_role;
grant select, insert, update, delete on public.vehicle_reminders to authenticated;
grant all on public.vehicle_reminders to service_role;
