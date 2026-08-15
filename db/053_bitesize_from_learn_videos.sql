-- DSM Learn → Bitesize
--
-- One content record per video. Bitesize reads the existing public.learn_videos
-- rows; it does NOT get its own video library. This migration only makes sure
-- the Bitesize flags exist and backfills them for short instructor videos that
-- are already in DSM Learn. Safe to re-run.

alter table public.learn_videos add column if not exists kind text not null default 'library';
alter table public.learn_videos add column if not exists source text;
alter table public.learn_videos add column if not exists source_url text;
alter table public.learn_videos add column if not exists duration_seconds integer;
alter table public.learn_videos add column if not exists categories text[] default '{}'::text[];
alter table public.learn_videos add column if not exists topics text[] default '{}'::text[];
alter table public.learn_videos add column if not exists audience text;
alter table public.learn_videos add column if not exists is_bitesize boolean not null default false;
alter table public.learn_videos add column if not exists bitesize_category text;
alter table public.learn_videos add column if not exists is_featured boolean not null default false;
alter table public.learn_videos add column if not exists is_published boolean not null default true;

create index if not exists learn_videos_bitesize_idx
  on public.learn_videos (is_bitesize, is_published);

-- Minutes for a row, from duration_seconds or the free-text duration column.
create or replace function public.learn_video_minutes(_duration_seconds integer, _duration text)
returns numeric
language sql
immutable
as $$
  select case
    when _duration_seconds is not null and _duration_seconds > 0
      then _duration_seconds::numeric / 60
    when _duration ~ '^\s*\d+\s*:\s*\d{1,2}\s*$'
      then split_part(_duration, ':', 1)::numeric + split_part(_duration, ':', 2)::numeric / 60
    when _duration ~ '\d'
      then (regexp_match(_duration, '\d+'))[1]::numeric
    else null
  end
$$;

-- 1–15 minute instructor/driving videos become Bitesize automatically.
update public.learn_videos
set is_bitesize = true
where coalesce(kind, 'library') = 'library'
  and coalesce(is_published, true)
  and is_bitesize is distinct from true
  and public.learn_video_minutes(duration_seconds, duration::text) between 1 and 15;

-- ADINJC "Ten Minute Takeaways" are Bitesize by definition.
update public.learn_videos
set is_bitesize = true,
    bitesize_category = coalesce(bitesize_category, 'CPD')
where title ilike '%takeaway%'
  and coalesce(kind, 'library') = 'library';

-- Give unlabelled Bitesize rows a sensible category from their Learn categories.
update public.learn_videos
set bitesize_category = case
  when 'CPD' = any(coalesce(categories, '{}')) then 'CPD'
  when 'Road Safety' = any(coalesce(categories, '{}')) then 'Road Safety'
  when 'Instructor' = any(coalesce(categories, '{}')) then 'Instructor Tip'
  when 'Psychology & Behaviour' = any(coalesce(categories, '{}')) then 'Psychology'
  when 'Technology & AI' = any(coalesce(categories, '{}')) then 'AI & Technology'
  when 'Driving' = any(coalesce(categories, '{}')) then 'Driving Tip'
  else 'Instructor Tip'
end
where is_bitesize = true
  and (bitesize_category is null or bitesize_category = '');

-- Feature the first Ten Minute Takeaway so Bitesize always leads with one.
update public.learn_videos
set is_featured = true
where id in (
  select id from public.learn_videos
  where title ilike '%takeaway%' and is_bitesize = true
  order by sort_order nulls last, title
  limit 1
);
