-- Backfill thumbnail_url for existing YouTube learn_videos rows.
-- Derives https://img.youtube.com/vi/{videoId}/hqdefault.jpg from the stored url.
-- Safe to re-run.

update public.learn_videos
set thumbnail_url =
  'https://img.youtube.com/vi/'
  || (regexp_match(
        url,
        '(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([a-zA-Z0-9_-]{11})'
      ))[1]
  || '/hqdefault.jpg'
where thumbnail_url is null
  and url is not null
  and url ~ '(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([a-zA-Z0-9_-]{11})';
