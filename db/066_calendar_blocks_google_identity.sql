-- Phase 2 — stable identity for imported Google Calendar events.
-- Run in the Supabase SQL editor. Safe to run more than once: every statement
-- is guarded, and nothing is dropped or rewritten.
--
-- Until now imported Google events were wiped and re-inserted on every sync,
-- so nothing tied a stored row back to the Google event it came from. These
-- columns give each imported row a permanent link to its Google counterpart.

alter table public.calendar_blocks add column if not exists external_event_id text;
alter table public.calendar_blocks add column if not exists external_calendar_id text;
alter table public.calendar_blocks add column if not exists external_updated_at timestamptz;
alter table public.calendar_blocks add column if not exists last_synced_at timestamptz;

-- One row per Google event per calendar per instructor.
create unique index if not exists calendar_blocks_google_event_unique
  on public.calendar_blocks (instructor_id, external_calendar_id, external_event_id)
  where source = 'external_calendar' and external_event_id is not null;

-- Supports the per-instructor window queries the sync and the diary run.
create index if not exists calendar_blocks_instructor_source_start_idx
  on public.calendar_blocks (instructor_id, source, start_datetime);

-- Existing imported rows keep working; they gain their Google id on the next
-- sync. No grants or policies change — calendar_blocks already has its own.
