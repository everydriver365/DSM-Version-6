-- Partner branding images for Benefits & Perks.
-- Assets live in the existing public "marketplace-images" storage bucket
-- under the benefits/partners/ prefix; these columns hold the public URLs.
-- Safe to re-run.

alter table public.benefit_partners
  add column if not exists logo_url text;

alter table public.benefit_partners
  add column if not exists hero_image_url text;
