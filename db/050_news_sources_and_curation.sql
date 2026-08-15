-- DSM News — source registry + curation columns
-- Extends the existing news_articles feed into a curated Instructor News feed.
-- Road Alerts is untouched: live incidents/traffic/closures stay there.

-- ---------------------------------------------------------------- sources
create table if not exists public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  feed_url text,
  kind text not null default 'rss',            -- rss | gov | social
  tier smallint not null default 2,            -- 1 official, 2 industry, 3 motoring, 4 social
  default_category text not null default 'general',
  requires_approval boolean not null default false,
  enabled boolean not null default true,
  priority integer not null default 100,       -- lower = higher priority
  created_at timestamptz default now()
);

grant select on public.news_sources to authenticated;
grant insert, update, delete on public.news_sources to authenticated;
grant all on public.news_sources to service_role;

alter table public.news_sources enable row level security;

drop policy if exists "News sources readable" on public.news_sources;
create policy "News sources readable"
  on public.news_sources for select
  to authenticated
  using (true);

drop policy if exists "Admins manage news sources" on public.news_sources;
create policy "Admins manage news sources"
  on public.news_sources for all
  to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create unique index if not exists news_sources_url_idx on public.news_sources (url);

-- ------------------------------------------------------- article curation
alter table public.news_articles add column if not exists source_id uuid references public.news_sources(id) on delete set null;
alter table public.news_articles add column if not exists summary text;
alter table public.news_articles add column if not exists why_matters text;
alter table public.news_articles add column if not exists importance text default 'normal';   -- normal | important
alter table public.news_articles add column if not exists tier smallint default 2;
alter table public.news_articles add column if not exists dedupe_key text;
alter table public.news_articles add column if not exists extra_sources jsonb default '[]'::jsonb;
alter table public.news_articles add column if not exists is_featured boolean default false;
alter table public.news_articles add column if not exists display_order integer;
alter table public.news_articles add column if not exists status text default 'approved';     -- pending | approved | rejected
alter table public.news_articles add column if not exists related_learn_id text;
alter table public.news_articles add column if not exists related_podcast_show text;
alter table public.news_articles add column if not exists local_area text;

create unique index if not exists news_articles_dedupe_idx on public.news_articles (dedupe_key) where dedupe_key is not null;
create index if not exists news_articles_category_idx on public.news_articles (category, published_at desc);
create index if not exists news_articles_importance_idx on public.news_articles (importance, published_at desc);

-- ---------------------------------------------------------------- seeding
insert into public.news_sources (name, url, feed_url, kind, tier, default_category, priority, enabled)
values
  -- Tier 1 — official / government
  ('DVSA Despatch', 'https://despatch.blog.gov.uk/', 'https://despatch.blog.gov.uk/feed/', 'rss', 1, 'dvsa', 1, true),
  ('DVSA', 'https://www.gov.uk/government/organisations/driver-and-vehicle-standards-agency', 'https://www.gov.uk/search/all.atom?organisations%5B%5D=driver-and-vehicle-standards-agency', 'gov', 1, 'dvsa', 2, true),
  ('DVSA Statistics', 'https://www.gov.uk/government/organisations/driver-and-vehicle-standards-agency/about/statistics', 'https://www.gov.uk/search/research-and-statistics.atom?organisations%5B%5D=driver-and-vehicle-standards-agency', 'gov', 1, 'data', 3, true),
  ('Department for Transport', 'https://www.gov.uk/government/organisations/department-for-transport', 'https://www.gov.uk/search/all.atom?organisations%5B%5D=department-for-transport', 'gov', 1, 'general', 10, true),
  ('DVLA', 'https://www.gov.uk/government/organisations/driver-and-vehicle-licensing-agency', 'https://www.gov.uk/search/all.atom?organisations%5B%5D=driver-and-vehicle-licensing-agency', 'gov', 1, 'important', 11, true),
  ('THINK!', 'https://www.think.gov.uk/', 'https://www.think.gov.uk/feed/', 'rss', 1, 'road-safety', 12, true),
  ('National Highways', 'https://nationalhighways.co.uk/', 'https://nationalhighways.co.uk/feed/', 'rss', 1, 'road-safety', 13, true),
  -- Tier 2 — instructor / industry
  ('ADINJC', 'https://www.adinjc.org.uk/news/', 'https://www.adinjc.org.uk/feed/', 'rss', 2, 'instructor', 20, true),
  ('Intelligent Instructor', 'https://www.intelligentinstructor.co.uk/', 'https://www.intelligentinstructor.co.uk/feed/', 'rss', 2, 'instructor', 21, true),
  ('Driving Instructors Association', 'https://www.driving.org/', 'https://www.driving.org/feed/', 'rss', 2, 'instructor', 22, true),
  ('Inspire Instructor Training', 'https://inspireinstructortraining.com/', 'https://inspireinstructortraining.com/feed/', 'rss', 2, 'training', 23, true),
  ('RoSPA', 'https://www.rospa.com/', 'https://www.rospa.com/feed', 'rss', 2, 'road-safety', 24, true),
  ('IAM RoadSmart', 'https://www.iamroadsmart.com/', 'https://www.iamroadsmart.com/feed/', 'rss', 2, 'road-safety', 25, true),
  ('Brake', 'https://www.brake.org.uk/', 'https://www.brake.org.uk/feed', 'rss', 2, 'road-safety', 26, true),
  ('Road Safety GB', 'https://roadsafetygb.org.uk/', 'https://roadsafetygb.org.uk/feed/', 'rss', 2, 'road-safety', 27, true),
  -- Tier 3 — motoring / vehicles (optional, lower priority)
  ('Auto Express', 'https://www.autoexpress.co.uk/', 'https://www.autoexpress.co.uk/feed/all', 'rss', 3, 'cars-ev', 40, true),
  ('What Car?', 'https://www.whatcar.com/', 'https://www.whatcar.com/rss', 'rss', 3, 'cars-ev', 41, false),
  ('Autocar', 'https://www.autocar.co.uk/', 'https://www.autocar.co.uk/rss', 'rss', 3, 'cars-ev', 42, false),
  ('DrivingElectric', 'https://www.drivingelectric.com/', 'https://www.drivingelectric.com/feed/all', 'rss', 3, 'cars-ev', 43, true),
  ('Fleet News', 'https://www.fleetnews.co.uk/', 'https://www.fleetnews.co.uk/news/rss', 'rss', 3, 'business', 44, false),
  -- Tier 4 — social signals (disabled until API access is viable)
  ('DVSA on X', 'https://x.com/DVSAgovuk', null, 'social', 4, 'dvsa', 90, false)
on conflict (url) do nothing;
