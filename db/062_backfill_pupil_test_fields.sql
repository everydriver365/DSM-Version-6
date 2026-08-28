-- Backfill pupil test fields from existing test-day lessons.
--
-- The Upcoming Tests tile and page read tests from pupils.test_date /
-- test_time / test_centre, but Add Lesson historically only wrote a
-- lessons row with lesson_type = 'test'. This copies those future test
-- lessons onto the pupil record where no test date is set yet.

with future_tests as (
  select distinct on (l.pupil_id)
    l.pupil_id,
    l.lesson_date,
    l.lesson_time,
    l.pickup_location
  from public.lessons l
  where l.lesson_type = 'test'
    and l.pupil_id is not null
    and l.lesson_date >= current_date
    and coalesce(l.status, '') <> 'cancelled'
  order by l.pupil_id, l.lesson_date asc
)
update public.pupils p
set
  test_date = ft.lesson_date,
  test_time = coalesce(p.test_time, ft.lesson_time),
  test_centre = coalesce(nullif(trim(p.test_centre), ''), nullif(trim(ft.pickup_location), '')),
  test_status = coalesce(p.test_status, 'upcoming')
from future_tests ft
where p.id = ft.pupil_id
  and p.test_date is null;
