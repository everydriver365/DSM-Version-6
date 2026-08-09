-- Per-comment likes for DSM Showcase comments.
-- One row per (comment, instructor); the UI toggles by insert/delete.

create table if not exists public.showcase_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.showcase_comments(id) on delete cascade,
  instructor_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, instructor_id)
);

grant select, insert, delete on public.showcase_comment_likes to authenticated;
grant select on public.showcase_comment_likes to anon;
grant all on public.showcase_comment_likes to service_role;

alter table public.showcase_comment_likes enable row level security;

drop policy if exists "Anyone can read comment likes" on public.showcase_comment_likes;
create policy "Anyone can read comment likes"
  on public.showcase_comment_likes
  for select
  using (true);

drop policy if exists "Users can like comments" on public.showcase_comment_likes;
create policy "Users can like comments"
  on public.showcase_comment_likes
  for insert
  to authenticated
  with check (instructor_id = auth.uid());

drop policy if exists "Users can unlike their own likes" on public.showcase_comment_likes;
create policy "Users can unlike their own likes"
  on public.showcase_comment_likes
  for delete
  to authenticated
  using (instructor_id = auth.uid());

create index if not exists showcase_comment_likes_comment_idx
  on public.showcase_comment_likes (comment_id);
