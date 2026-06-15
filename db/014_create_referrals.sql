-- Referrals
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id),
  referred_name text not null,
  referred_phone text,
  status text default 'pending',
  reward_amount numeric default 0,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.referrals to authenticated;
grant all on public.referrals to service_role;

alter table referrals enable row level security;

drop policy if exists "Instructor sees own referrals" on referrals;
create policy "Instructor sees own referrals"
on referrals for all
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());
