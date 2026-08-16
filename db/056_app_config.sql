-- App configuration key-value store.
create table public.app_config (
    key text primary key,
    value text not null,
    updated_at timestamp with time zone default now()
);

-- Allow all authenticated users to read configuration values.
grant select on public.app_config to authenticated;
grant all on public.app_config to service_role;

-- Enable row-level security for the config table.
alter table public.app_config enable row level security;

-- Public read policy for authenticated users.
create policy "Authenticated users can read app config"
on public.app_config
for select
to authenticated
using (true);

-- Seed the DIA membership price used in the cancellation sheet.
insert into public.app_config (key, value)
values
  ('dia_membership_price', '£99/year'),
  ('dia_membership_joining_fee', '£25')
on conflict (key) do update set value = excluded.value, updated_at = now();
