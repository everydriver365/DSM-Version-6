-- Reports raised against individual DSM Showcase comments/replies.

create table if not exists public.showcase_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.showcase_comments(id) on delete cascade,
  instructor_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (comment_id, instructor_id)
);

create index if not exists showcase_comment_reports_comment_idx
  on public.showcase_comment_reports (comment_id);

grant select, insert on public.showcase_comment_reports to authenticated;
grant all on public.showcase_comment_reports to service_role;

alter table public.showcase_comment_reports enable row level security;

drop policy if exists "Users can read own comment reports" on public.showcase_comment_reports;
create policy "Users can read own comment reports"
  on public.showcase_comment_reports
  for select
  to authenticated
  using (instructor_id = auth.uid());

drop policy if exists "Users can report comments" on public.showcase_comment_reports;
create policy "Users can report comments"
  on public.showcase_comment_reports
  for insert
  to authenticated
  with check (instructor_id = auth.uid());
