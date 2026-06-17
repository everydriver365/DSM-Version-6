-- Web Push subscriptions per instructor (device-scoped)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  subscription jsonb not null,
  endpoint text generated always as (subscription->>'endpoint') stored,
  created_at timestamptz default now(),
  unique (instructor_id, endpoint)
);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

alter table public.push_subscriptions enable row level security;

create policy "Instructor manages own push subscriptions"
on public.push_subscriptions
for all
to authenticated
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());
