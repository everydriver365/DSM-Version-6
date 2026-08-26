-- Duplicate instructor notifications — diagnose + fix
-- Run in Supabase → SQL Editor. Sections 1-2 are read-only; section 3 changes data.
--
-- Background: live_starting_soon (4 rows in 150ms), bitesize_upload (2 rows,
-- identical timestamps) and showcase_report (2 rows) are inserted more than
-- once per event by a writer that lives outside the app repo.

-- ══ 1. Which duplicates exist right now ═════════════════════════════════
SELECT type, reference_id, count(*) AS copies, min(created_at) AS first_seen
FROM public.instructor_notifications
WHERE reference_id IS NOT NULL
GROUP BY 1, 2
HAVING count(*) > 1
ORDER BY copies DESC, first_seen DESC;

-- ══ 2. Who writes them (triggers, cron jobs, functions) ═════════════════
-- 2a. Triggers on the notification table and on the source tables
SELECT event_object_table, trigger_name, action_timing, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 2b. Functions whose body writes instructor_notifications
SELECT n.nspname AS schema, p.proname AS function
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE pg_get_functiondef(p.oid) ILIKE '%instructor_notifications%'
ORDER BY 1, 2;

-- 2c. Scheduled jobs (duplicate schedules are a common cause of exact-timestamp copies)
SELECT jobid, schedule, command, active FROM cron.job ORDER BY jobid;

-- ══ 3. Fix: collapse duplicates, then make them impossible ══════════════
BEGIN;

-- 3a. Keep the oldest row per (instructor, type, event); delete the rest.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY instructor_id, type, reference_id
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.instructor_notifications
  WHERE reference_id IS NOT NULL
)
DELETE FROM public.instructor_notifications n
USING ranked r
WHERE n.id = r.id AND r.rn > 1;

-- 3b. One notification per (instructor, type, event), for every writer.
--     Rows without a reference_id are free-form and stay unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS instructor_notifications_unique_event
  ON public.instructor_notifications (instructor_id, type, reference_id)
  WHERE reference_id IS NOT NULL;

COMMIT;

-- 3c. Update each writer found in step 2 so a repeat insert is a no-op
--     rather than an error:
--
--   INSERT INTO public.instructor_notifications (instructor_id, type, reference_id, ...)
--   VALUES (...)
--   ON CONFLICT (instructor_id, type, reference_id) WHERE reference_id IS NOT NULL
--   DO NOTHING;
