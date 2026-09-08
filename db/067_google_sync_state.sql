-- Phase 3: Google Calendar incremental sync state.
-- Guarded so it is safe to run against the live database whatever its shape.

alter table public.instructors add column if not exists google_sync_token text;
alter table public.instructors add column if not exists google_sync_error text;
alter table public.instructors add column if not exists google_sync_error_at timestamptz;
