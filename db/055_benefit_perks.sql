-- Individual perks belonging to a benefit partner.
-- Safe to re-run.

create table if not exists public.benefit_perks (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.benefit_partners(id) on delete cascade,
  name text not null,
  description text,
  detail_text text,
  category text,
  saving text,
  min_tier text not null default 'pro',
  cta_label text,
  cta_action text,
  hero_image_url text,
  gallery_urls text[] default '{}'::text[],
  bullet_points text[] default '{}'::text[],
  links jsonb default '[]'::jsonb,
  video_url text,
  video_embed_url text,
  coming_soon boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists benefit_perks_partner_idx
  on public.benefit_perks (partner_id, sort_order);

create index if not exists benefit_perks_active_idx
  on public.benefit_perks (active, sort_order);

grant select on public.benefit_perks to anon;
grant select, insert, update, delete on public.benefit_perks to authenticated;
grant all on public.benefit_perks to service_role;

alter table public.benefit_perks enable row level security;

drop policy if exists "benefit_perks_public_read" on public.benefit_perks;
create policy "benefit_perks_public_read"
  on public.benefit_perks for select
  using (active = true);

drop policy if exists "benefit_perks_admin_read" on public.benefit_perks;
create policy "benefit_perks_admin_read"
  on public.benefit_perks for select
  to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "benefit_perks_admin_write" on public.benefit_perks;
create policy "benefit_perks_admin_write"
  on public.benefit_perks for all
  to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
