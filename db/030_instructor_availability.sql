-- Quick availability fields for instructors
alter table public.instructors add column if not exists is_active boolean not null default true;
alter table public.instructors add column if not exists unavailable_until date;
alter table public.instructors add column if not exists unavailable_reason text;
