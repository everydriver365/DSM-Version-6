-- Run in the Supabase SQL editor.
-- Some databases predate db/058 and are missing the optional columns the
-- schedule page reads/writes for personal events.

alter table public.calendar_blocks add column if not exists is_all_day boolean default false;
alter table public.calendar_blocks add column if not exists location text;
alter table public.calendar_blocks add column if not exists notes text;
alter table public.calendar_blocks add column if not exists colour text;
alter table public.calendar_blocks add column if not exists blocks_availability boolean default true;
alter table public.calendar_blocks add column if not exists recurrence_group_id uuid;
