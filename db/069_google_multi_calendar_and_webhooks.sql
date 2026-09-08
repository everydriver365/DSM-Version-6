-- Phase 5: multiple Google calendars + instant updates (push notifications).
-- Guarded so it is safe to run against the live database whatever its shape.

-- Which Google calendars the instructor wants imported. Empty/null falls back
-- to the legacy single google_calendar_id (or "primary").
alter table public.instructors
  add column if not exists google_calendar_ids text[];

-- Per-calendar incremental sync tokens: { "<calendarId>": "<syncToken>" }.
alter table public.instructors
  add column if not exists google_sync_tokens jsonb not null default '{}'::jsonb;

-- Per-calendar push channels:
-- { "<calendarId>": { "channelId": "...", "resourceId": "...", "expiration": "..." } }
alter table public.instructors
  add column if not exists google_channels jsonb not null default '{}'::jsonb;

-- Fast lookup when a Google push notification arrives.
create index if not exists instructors_google_channels_idx
  on public.instructors using gin (google_channels);

-- Existing single-calendar state carries over on first run.
update public.instructors
   set google_calendar_ids = array[coalesce(google_calendar_id, 'primary')]
 where google_calendar_connected is true
   and (google_calendar_ids is null or cardinality(google_calendar_ids) = 0);
