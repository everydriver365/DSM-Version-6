-- EveryDriver — Phase 0 schema baseline.
-- READ ONLY. Run this in the Supabase SQL editor and send back the output.
-- Nothing here changes data or structure. The results are used to write a
-- baseline migration so the repo finally matches the live database.

-- 1. Every column of the tables the app depends on
select table_name, ordinal_position, column_name, data_type,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'lessons','calendar_blocks','instructors','pupils',
    'google_calendar_connections','instructor_calendar_connections',
    'gap_filler_offers','sms_queue',
    'pupil_ready_to_learn_settings','pupil_unavailability',
    'instructor_recurring_blocks','instructor_time_off',
    'lesson_series'
  )
order by table_name, ordinal_position;

-- 2. Constraints (does calendar_blocks_external_unique actually exist?)
select conrelid::regclass as table_name, conname, contype,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
order by 1, 2;

-- 3. Indexes
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 4. Row-level security state and policies
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by 1;

select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 5. Triggers and functions
select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
order by 1, 2;

-- 6. Production data volume (informs the rollback plan)
select 'lessons' as t, count(*) from lessons
union all select 'calendar_blocks', count(*) from calendar_blocks
union all select 'lessons_with_google_event', count(*) from lessons where google_event_id is not null
union all select 'external_calendar_blocks', count(*) from calendar_blocks where source = 'external_calendar';

-- 7. Database timezone (affects any naive timestamp written previously)
show timezone;
