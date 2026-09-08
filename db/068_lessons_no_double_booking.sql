-- Phase 4: double-booking safety.
-- Guarded so it is safe to run against the live database whatever its shape.
-- Lesson times are stored as London wall-clock (date + time), so a plain
-- timestamp range is correct here and, unlike a timezone conversion, immutable.

create extension if not exists btree_gist;

alter table public.lessons
  add column if not exists lesson_span tsrange
  generated always as (
    tsrange(
      (lesson_date + lesson_time),
      (lesson_date + lesson_time) + make_interval(mins => coalesce(duration_minutes, 60)),
      '[)'
    )
  ) stored;

do $$
declare
  overlap_count integer;
begin
  if exists (
    select 1 from pg_constraint where conname = 'lessons_no_overlap'
  ) then
    raise notice 'lessons_no_overlap already exists — nothing to do.';
    return;
  end if;

  -- Report pre-existing clashes rather than failing with an opaque error.
  select count(*) into overlap_count
  from public.lessons a
  join public.lessons b
    on a.instructor_id = b.instructor_id
   and a.id < b.id
   and a.lesson_span && b.lesson_span
  where a.deleted_at is null and b.deleted_at is null
    and coalesce(a.status, '') <> 'cancelled'
    and coalesce(b.status, '') <> 'cancelled';

  if overlap_count > 0 then
    raise notice 'Found % existing overlapping lesson pair(s). Constraint NOT created — resolve these first (see query in this file).', overlap_count;
    return;
  end if;

  alter table public.lessons
    add constraint lessons_no_overlap
    exclude using gist (
      instructor_id with =,
      lesson_span with &&
    ) where (deleted_at is null and status <> 'cancelled');
end
$$;

-- To list existing clashes:
-- select a.id, b.id, a.instructor_id, a.lesson_span, b.lesson_span
-- from public.lessons a join public.lessons b
--   on a.instructor_id = b.instructor_id and a.id < b.id and a.lesson_span && b.lesson_span
-- where a.deleted_at is null and b.deleted_at is null
--   and coalesce(a.status,'') <> 'cancelled' and coalesce(b.status,'') <> 'cancelled';
