-- DSM Learn → Videos: add the two Sir Ken Robinson TED talks that are already
-- pinned in the podcast section, so they also appear as watchable videos.

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Do schools kill creativity? | Sir Ken Robinson', 'Sir Ken Robinson makes an entertaining and profoundly moving case for creating an education system that nurtures (rather than undermines) creativity.', 19, 1164, 'https://www.youtube.com/watch?v=iG9CE55wbtY', 'https://img.youtube.com/vi/iG9CE55wbtY/hqdefault.jpg', 140, 'library', 'TED', 'https://www.ted.com/talks/sir_ken_robinson_do_schools_kill_creativity', array['CPD','Psychology & Behaviour','Learner Teaching']::text[], '{}'::text[], 'instructor', false, null, true, true
where not exists (select 1 from public.learn_videos where url like '%iG9CE55wbtY%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Bring on the learning revolution! | Sir Ken Robinson', 'Sir Ken Robinson makes the case for a radical shift from standardised schooling to personalised learning that lets people discover their natural talents.', 18, 1065, 'https://www.youtube.com/watch?v=r9LelXa3U_I', 'https://img.youtube.com/vi/r9LelXa3U_I/hqdefault.jpg', 141, 'library', 'TED', 'https://www.ted.com/talks/sir_ken_robinson_bring_on_the_learning_revolution', array['CPD','Psychology & Behaviour','Learner Teaching']::text[], '{}'::text[], 'instructor', false, null, true, true
where not exists (select 1 from public.learn_videos where url like '%r9LelXa3U_I%');
