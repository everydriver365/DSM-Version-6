-- Coordinates + category for saved (favourite) nearby locations
alter table public.saved_locations add column if not exists lat double precision;
alter table public.saved_locations add column if not exists lng double precision;
alter table public.saved_locations add column if not exists category text;
alter table public.saved_locations add column if not exists place_id text;

create index if not exists saved_locations_instructor_idx
  on public.saved_locations (instructor_id, created_at desc);
