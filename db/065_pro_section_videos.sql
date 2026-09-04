-- Explainer videos for each section of the PRO teaser page.
create table if not exists public.pro_section_videos (
    section text primary key,
    title text,
    video_url text,
    updated_at timestamp with time zone default now()
);

grant select on public.pro_section_videos to authenticated;
grant select on public.pro_section_videos to anon;
grant all on public.pro_section_videos to service_role;

alter table public.pro_section_videos enable row level security;

drop policy if exists "Anyone can read pro section videos" on public.pro_section_videos;
create policy "Anyone can read pro section videos"
on public.pro_section_videos
for select
to authenticated, anon
using (true);

drop policy if exists "Admins can manage pro section videos" on public.pro_section_videos;
create policy "Admins can manage pro section videos"
on public.pro_section_videos
for all
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

grant insert, update, delete on public.pro_section_videos to authenticated;
