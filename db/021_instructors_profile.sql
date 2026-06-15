-- Add profile fields to instructors. Create avatars storage bucket manually in Supabase dashboard (public).
alter table public.instructors add column if not exists phone text;
alter table public.instructors add column if not exists bio text;
alter table public.instructors add column if not exists car_make text;
alter table public.instructors add column if not exists car_model text;
alter table public.instructors add column if not exists profile_image_url text;
