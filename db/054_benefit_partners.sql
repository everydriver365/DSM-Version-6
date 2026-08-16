-- Benefits & Perks partners, managed from the admin hub.
-- Safe to re-run.

create table if not exists public.benefit_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text,
  description text,
  icon text,
  icon_bg text,
  icon_color text,
  category text,
  perks text[] default '{}'::text[],
  saving text,
  min_tier text not null default 'pro',
  cta_label text,
  cta_action text,
  coming_soon boolean not null default false,
  exclusive boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists benefit_partners_active_idx
  on public.benefit_partners (active, sort_order);

grant select on public.benefit_partners to anon;
grant select on public.benefit_partners to authenticated;
grant all on public.benefit_partners to service_role;

alter table public.benefit_partners enable row level security;

drop policy if exists "benefit_partners_public_read" on public.benefit_partners;
create policy "benefit_partners_public_read"
  on public.benefit_partners for select
  using (active = true);

drop policy if exists "benefit_partners_admin_read" on public.benefit_partners;
create policy "benefit_partners_admin_read"
  on public.benefit_partners for select
  to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "benefit_partners_admin_write" on public.benefit_partners;
create policy "benefit_partners_admin_write"
  on public.benefit_partners for all
  to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

grant insert, update, delete on public.benefit_partners to authenticated;
