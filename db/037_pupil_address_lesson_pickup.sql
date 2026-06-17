-- Run in the Supabase SQL editor.
-- Adds pupil home address and lesson pickup location.

alter table public.pupils
  add column if not exists address text;

alter table public.lessons
  add column if not exists pickup_location text;
