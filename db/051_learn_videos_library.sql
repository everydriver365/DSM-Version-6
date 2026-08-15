-- 051: DSM Learn → Videos.
-- Extends the existing learn_videos table (used for DSM "How to" clips) into the
-- shared content record for the Learn video library and Bitesize. No new table,
-- no new favourites/progress system, no re-hosting: every seeded row is an
-- official YouTube URL played through the standard YouTube embed with
-- attribution retained.

alter table public.learn_videos add column if not exists kind text not null default 'howto';
alter table public.learn_videos add column if not exists source text;
alter table public.learn_videos add column if not exists source_url text;
alter table public.learn_videos add column if not exists categories text[] not null default '{}';
alter table public.learn_videos add column if not exists topics text[] not null default '{}';
alter table public.learn_videos add column if not exists audience text not null default 'instructor';
alter table public.learn_videos add column if not exists is_bitesize boolean not null default false;
alter table public.learn_videos add column if not exists bitesize_category text;
alter table public.learn_videos add column if not exists is_featured boolean not null default false;
alter table public.learn_videos add column if not exists is_published boolean not null default true;
alter table public.learn_videos add column if not exists duration_seconds integer;
alter table public.learn_videos add column if not exists embed_url text;
alter table public.learn_videos add column if not exists related_podcast_slug text;
alter table public.learn_videos add column if not exists related_learn_item_id text;
alter table public.learn_videos add column if not exists revision_topic text;

create index if not exists learn_videos_kind_idx on public.learn_videos (kind, is_published);
create index if not exists learn_videos_bitesize_idx on public.learn_videos (is_bitesize, is_published);

-- Existing rows stay in the "How to" grid.
update public.learn_videos set kind = 'howto' where kind is null;

-- Seed: publicly available instructor-training videos from How-2-Drive,
-- Driver Training Ltd and the ADINJC Ten Minute Takeaways video resource hub.
insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'What should you do after a safety-critical incident? | ADI Part 3 training', 'Handling a safety-critical moment in a lesson and what examiners expect afterwards.', 24, 1457, 'https://www.youtube.com/watch?v=HNPJGbRmuRE', 'https://img.youtube.com/vi/HNPJGbRmuRE/hqdefault.jpg', 100, 'library', 'How-2-Drive', 'https://www.youtube.com/channel/UC5JNyKvRB7uDPORlhJbehHw', array['Instructor','CPD','Road Safety']::text[], array['awareness','judgement']::text[], 'instructor', false, null, true, true
where not exists (select 1 from public.learn_videos where url like '%HNPJGbRmuRE%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'ADI Part 2: top tips from an ADI examiner', 'An examiner''s view on what separates a strong Part 2 drive from a weak one.', 24, 1416, 'https://www.youtube.com/watch?v=dBSZlRfmjYY', 'https://img.youtube.com/vi/dBSZlRfmjYY/hqdefault.jpg', 101, 'library', 'How-2-Drive', 'https://www.youtube.com/channel/UC5JNyKvRB7uDPORlhJbehHw', array['Instructor','Test Preparation','Driving']::text[], array['use_of_speed','progress']::text[], 'instructor', false, null, false, true
where not exists (select 1 from public.learn_videos where url like '%dBSZlRfmjYY%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'ADI Part 3: Q14 — Ask the Examiner', 'Short examiner answer on a common Part 3 question.', 5, 272, 'https://www.youtube.com/watch?v=8YW7C07X4Wo', 'https://img.youtube.com/vi/8YW7C07X4Wo/hqdefault.jpg', 102, 'library', 'How-2-Drive', 'https://www.youtube.com/channel/UC5JNyKvRB7uDPORlhJbehHw', array['Instructor','CPD']::text[], '{}'::text[], 'instructor', true, 'Instructor Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%8YW7C07X4Wo%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'ADI Part 3: Q13 — Ask the Examiner', 'Short examiner answer on a common Part 3 question.', 10, 589, 'https://www.youtube.com/watch?v=iX0XhXORdFw', 'https://img.youtube.com/vi/iX0XhXORdFw/hqdefault.jpg', 103, 'library', 'How-2-Drive', 'https://www.youtube.com/channel/UC5JNyKvRB7uDPORlhJbehHw', array['Instructor','CPD']::text[], '{}'::text[], 'instructor', true, 'Instructor Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%iX0XhXORdFw%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'ADI Part 3: Q12 — Ask the Examiner', 'Short examiner answer on a common Part 3 question.', 12, 733, 'https://www.youtube.com/watch?v=6Omo-17hI7k', 'https://img.youtube.com/vi/6Omo-17hI7k/hqdefault.jpg', 104, 'library', 'How-2-Drive', 'https://www.youtube.com/channel/UC5JNyKvRB7uDPORlhJbehHw', array['Instructor','CPD']::text[], '{}'::text[], 'instructor', true, 'Instructor Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%6Omo-17hI7k%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'ADI Part 3: Q11 — Ask the Examiner', 'Short examiner answer on a common Part 3 question.', 8, 498, 'https://www.youtube.com/watch?v=J50IvCZWHPg', 'https://img.youtube.com/vi/J50IvCZWHPg/hqdefault.jpg', 105, 'library', 'How-2-Drive', 'https://www.youtube.com/channel/UC5JNyKvRB7uDPORlhJbehHw', array['Instructor','CPD']::text[], '{}'::text[], 'instructor', true, 'Instructor Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%J50IvCZWHPg%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'ADI Part 3: Q10 — Ask the Examiner', 'Short examiner answer on a common Part 3 question.', 4, 242, 'https://www.youtube.com/watch?v=EAVREaqRCaQ', 'https://img.youtube.com/vi/EAVREaqRCaQ/hqdefault.jpg', 106, 'library', 'How-2-Drive', 'https://www.youtube.com/channel/UC5JNyKvRB7uDPORlhJbehHw', array['Instructor','CPD']::text[], '{}'::text[], 'instructor', true, 'Instructor Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%EAVREaqRCaQ%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'ADI Part 3: Q9 — Ask the Examiner', 'Short examiner answer on a common Part 3 question.', 9, 545, 'https://www.youtube.com/watch?v=GHYzIyIw9mM', 'https://img.youtube.com/vi/GHYzIyIw9mM/hqdefault.jpg', 107, 'library', 'How-2-Drive', 'https://www.youtube.com/channel/UC5JNyKvRB7uDPORlhJbehHw', array['Instructor','CPD']::text[], '{}'::text[], 'instructor', true, 'Instructor Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%GHYzIyIw9mM%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'ADI Part 3: Q8 — Ask the Examiner', 'Short examiner answer on a common Part 3 question.', 9, 569, 'https://www.youtube.com/watch?v=5zhz2atedMA', 'https://img.youtube.com/vi/5zhz2atedMA/hqdefault.jpg', 108, 'library', 'How-2-Drive', 'https://www.youtube.com/channel/UC5JNyKvRB7uDPORlhJbehHw', array['Instructor','CPD']::text[], '{}'::text[], 'instructor', true, 'Instructor Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%5zhz2atedMA%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'ADI Part 3: Q7 — Ask the Examiner', 'Short examiner answer on a common Part 3 question.', 4, 217, 'https://www.youtube.com/watch?v=iYJxdO1NReU', 'https://img.youtube.com/vi/iYJxdO1NReU/hqdefault.jpg', 109, 'library', 'How-2-Drive', 'https://www.youtube.com/channel/UC5JNyKvRB7uDPORlhJbehHw', array['Instructor','CPD']::text[], '{}'::text[], 'instructor', true, 'Instructor Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%iYJxdO1NReU%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'ADI Part 3: Q6 — Ask the Examiner', 'Short examiner answer on a common Part 3 question.', 6, 342, 'https://www.youtube.com/watch?v=3dL2AIV9uB0', 'https://img.youtube.com/vi/3dL2AIV9uB0/hqdefault.jpg', 110, 'library', 'How-2-Drive', 'https://www.youtube.com/channel/UC5JNyKvRB7uDPORlhJbehHw', array['Instructor','CPD']::text[], '{}'::text[], 'instructor', true, 'Instructor Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%3dL2AIV9uB0%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Examiner''s report shows the biggest ADI Part 3 mistakes', 'Fault analysis of the mistakes that cost trainers marks on Part 3.', 19, 1111, 'https://www.youtube.com/watch?v=y5o4yHNqKME', 'https://img.youtube.com/vi/y5o4yHNqKME/hqdefault.jpg', 111, 'library', 'Driver Training Ltd', 'https://www.youtube.com/channel/UCHJcpHHtR_BZMqFjp8vM_Ng', array['Instructor','CPD','Test Preparation']::text[], '{}'::text[], 'instructor', false, null, true, true
where not exists (select 1 from public.learn_videos where url like '%y5o4yHNqKME%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Is 60 too old to become a driving instructor?', 'A quick answer for anyone weighing up a career change into instructing.', 1, 63, 'https://www.youtube.com/watch?v=3Q9eDYchaO8', 'https://img.youtube.com/vi/3Q9eDYchaO8/hqdefault.jpg', 112, 'library', 'Driver Training Ltd', 'https://www.youtube.com/channel/UCHJcpHHtR_BZMqFjp8vM_Ng', array['Instructor']::text[], '{}'::text[], 'instructor', true, 'Instructor Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%3Q9eDYchaO8%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'What are the best ADI Part 3 training options?', 'Choosing training that actually prepares you for Part 3.', 3, 175, 'https://www.youtube.com/watch?v=RjOfb7bDZNs', 'https://img.youtube.com/vi/RjOfb7bDZNs/hqdefault.jpg', 113, 'library', 'Driver Training Ltd', 'https://www.youtube.com/channel/UCHJcpHHtR_BZMqFjp8vM_Ng', array['Instructor','CPD']::text[], '{}'::text[], 'instructor', true, 'Instructor Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%RjOfb7bDZNs%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Why your ADI Part 3 lesson plan is already client centred', 'Client-centred learning explained through the lesson plan you already use.', 9, 518, 'https://www.youtube.com/watch?v=ZcOaI3DtiXY', 'https://img.youtube.com/vi/ZcOaI3DtiXY/hqdefault.jpg', 114, 'library', 'Driver Training Ltd', 'https://www.youtube.com/channel/UCHJcpHHtR_BZMqFjp8vM_Ng', array['Instructor','CPD','Learner Teaching']::text[], '{}'::text[], 'instructor', true, 'CPD', false, true
where not exists (select 1 from public.learn_videos where url like '%ZcOaI3DtiXY%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'The ADI Part 3 training flaw: personalised learning is missing', 'Why personalised learning matters more than a scripted lesson.', 7, 429, 'https://www.youtube.com/watch?v=Pl7Jf1RfHAs', 'https://img.youtube.com/vi/Pl7Jf1RfHAs/hqdefault.jpg', 115, 'library', 'Driver Training Ltd', 'https://www.youtube.com/channel/UCHJcpHHtR_BZMqFjp8vM_Ng', array['Instructor','CPD','Psychology & Behaviour']::text[], '{}'::text[], 'instructor', true, 'CPD', false, true
where not exists (select 1 from public.learn_videos where url like '%Pl7Jf1RfHAs%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'What examiners really want to see on Part 3', 'A 90-second reminder of what the Standards Check form rewards.', 1, 83, 'https://www.youtube.com/watch?v=cmkhN8DJIGA', 'https://img.youtube.com/vi/cmkhN8DJIGA/hqdefault.jpg', 116, 'library', 'Driver Training Ltd', 'https://www.youtube.com/channel/UCHJcpHHtR_BZMqFjp8vM_Ng', array['Instructor','Test Preparation']::text[], '{}'::text[], 'instructor', true, 'Instructor Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%cmkhN8DJIGA%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Boost your ADI Part 3 with progress books', 'Using pupil progress records to evidence development.', 2, 135, 'https://www.youtube.com/watch?v=zTprVnSnRfI', 'https://img.youtube.com/vi/zTprVnSnRfI/hqdefault.jpg', 117, 'library', 'Driver Training Ltd', 'https://www.youtube.com/channel/UCHJcpHHtR_BZMqFjp8vM_Ng', array['Instructor','Learner Teaching']::text[], '{}'::text[], 'instructor', true, 'Instructor Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%zTprVnSnRfI%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Turning right at crossroads — forget nearside and offside', 'A simpler way to explain oncoming-turn decisions at crossroads.', 1, 78, 'https://www.youtube.com/watch?v=GMgSfEntW2w', 'https://img.youtube.com/vi/GMgSfEntW2w/hqdefault.jpg', 118, 'library', 'Driver Training Ltd', 'https://www.youtube.com/channel/UCHJcpHHtR_BZMqFjp8vM_Ng', array['Roundabouts & Junctions','Learner Teaching','Driving']::text[], array['junctions','positioning']::text[], 'both', true, 'Driving Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%GMgSfEntW2w%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'What is an urban clearway? Explained', 'Signs and rules for urban clearways in under two minutes.', 1, 85, 'https://www.youtube.com/watch?v=uJKqj4I-cW4', 'https://img.youtube.com/vi/uJKqj4I-cW4/hqdefault.jpg', 119, 'library', 'Driver Training Ltd', 'https://www.youtube.com/channel/UCHJcpHHtR_BZMqFjp8vM_Ng', array['Road Safety','Driving']::text[], array['response_signs']::text[], 'both', true, 'Driving Tip', false, true
where not exists (select 1 from public.learn_videos where url like '%uJKqj4I-cW4%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Ten Minute Takeaways: Client centred learning', 'ADINJC Ten Minute Takeaway on client centred learning.', 11, 660, 'https://www.youtube.com/watch?v=ZnSY5Yb9TFs', 'https://img.youtube.com/vi/ZnSY5Yb9TFs/hqdefault.jpg', 120, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Instructor','Learner Teaching']::text[], '{}'::text[], 'instructor', true, 'CPD', true, true
where not exists (select 1 from public.learn_videos where url like '%ZnSY5Yb9TFs%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Ten Minute Takeaways: Goals vs needs', 'Balancing what a pupil wants with what they need.', 11, 681, 'https://www.youtube.com/watch?v=2XIvcCldCjk', 'https://img.youtube.com/vi/2XIvcCldCjk/hqdefault.jpg', 121, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Instructor','Psychology & Behaviour']::text[], array['progress']::text[], 'instructor', true, 'CPD', false, true
where not exists (select 1 from public.learn_videos where url like '%2XIvcCldCjk%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Ten Minute Takeaways: Introducing road safety into driving lessons', 'Weaving road safety messages into everyday lessons.', 12, 725, 'https://www.youtube.com/watch?v=C45MIlVp0UA', 'https://img.youtube.com/vi/C45MIlVp0UA/hqdefault.jpg', 122, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Road Safety','Learner Teaching']::text[], array['awareness']::text[], 'instructor', true, 'Road Safety', false, true
where not exists (select 1 from public.learn_videos where url like '%C45MIlVp0UA%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Ten Minute Takeaways: ADI professionalism with John Sheridan', 'What professionalism looks like day to day for an ADI.', 12, 738, 'https://www.youtube.com/watch?v=GI47TFMc6Hc', 'https://img.youtube.com/vi/GI47TFMc6Hc/hqdefault.jpg', 123, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Instructor']::text[], '{}'::text[], 'instructor', true, 'CPD', false, true
where not exists (select 1 from public.learn_videos where url like '%GI47TFMc6Hc%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Ten Minute Takeaways: Planning for Part 3 and Standards Check tests', 'Preparing properly for Part 3 and the Standards Check.', 11, 654, 'https://www.youtube.com/watch?v=JaBrEbxHiMQ', 'https://img.youtube.com/vi/JaBrEbxHiMQ/hqdefault.jpg', 124, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Instructor','Test Preparation']::text[], '{}'::text[], 'instructor', true, 'CPD', false, true
where not exists (select 1 from public.learn_videos where url like '%JaBrEbxHiMQ%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Ten Minute Takeaways: Local associations', 'How local associations support instructor development.', 11, 665, 'https://www.youtube.com/watch?v=LBsAXCY_gwQ', 'https://img.youtube.com/vi/LBsAXCY_gwQ/hqdefault.jpg', 125, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Instructor']::text[], '{}'::text[], 'instructor', true, 'CPD', false, true
where not exists (select 1 from public.learn_videos where url like '%LBsAXCY_gwQ%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Ten Minute Takeaways: Responsibility', 'Sharing responsibility for learning with your pupil.', 12, 695, 'https://www.youtube.com/watch?v=M6A9KuGBej0', 'https://img.youtube.com/vi/M6A9KuGBej0/hqdefault.jpg', 126, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Instructor','Psychology & Behaviour']::text[], '{}'::text[], 'instructor', true, 'CPD', false, true
where not exists (select 1 from public.learn_videos where url like '%M6A9KuGBej0%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Ten Minute Takeaways: Passing horses', 'Teaching safe, considerate passing of horses and riders.', 12, 690, 'https://www.youtube.com/watch?v=RJpwM1TOEZo', 'https://img.youtube.com/vi/RJpwM1TOEZo/hqdefault.jpg', 127, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Road Safety','Driving']::text[], array['judgement','awareness']::text[], 'both', true, 'Road Safety', false, true
where not exists (select 1 from public.learn_videos where url like '%RJpwM1TOEZo%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Ten Minute Takeaways: Managing driving tests', 'Getting pupils to test day in the right frame of mind.', 11, 660, 'https://www.youtube.com/watch?v=SxzpeuFTB6k', 'https://img.youtube.com/vi/SxzpeuFTB6k/hqdefault.jpg', 128, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Test Preparation']::text[], '{}'::text[], 'instructor', true, 'CPD', false, true
where not exists (select 1 from public.learn_videos where url like '%SxzpeuFTB6k%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Ten Minute Takeaways: Mock tests', 'Running a mock test that genuinely predicts readiness.', 11, 652, 'https://www.youtube.com/watch?v=VmbM91BeAh8', 'https://img.youtube.com/vi/VmbM91BeAh8/hqdefault.jpg', 129, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Test Preparation','Learner Teaching']::text[], '{}'::text[], 'instructor', true, 'CPD', false, true
where not exists (select 1 from public.learn_videos where url like '%VmbM91BeAh8%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Ten Minute Takeaways: Watching the learner', 'Reading what your pupil is actually doing, not what you expect.', 12, 746, 'https://www.youtube.com/watch?v=Wd7v_4TUs78', 'https://img.youtube.com/vi/Wd7v_4TUs78/hqdefault.jpg', 130, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Learner Teaching','Hazard Perception']::text[], array['awareness','mirrors']::text[], 'instructor', true, 'Instructor Tip', true, true
where not exists (select 1 from public.learn_videos where url like '%Wd7v_4TUs78%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Ten Minute Takeaways: CPD', 'Making continuing professional development a habit.', 12, 704, 'https://www.youtube.com/watch?v=Wmk5Xe1TGe0', 'https://img.youtube.com/vi/Wmk5Xe1TGe0/hqdefault.jpg', 131, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Instructor']::text[], '{}'::text[], 'instructor', true, 'CPD', false, true
where not exists (select 1 from public.learn_videos where url like '%Wmk5Xe1TGe0%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Ten Minute Takeaways: The importance of theory', 'Keeping theory knowledge alive alongside practical skills.', 11, 673, 'https://www.youtube.com/watch?v=iM0mqfSIj7U', 'https://img.youtube.com/vi/iM0mqfSIj7U/hqdefault.jpg', 132, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Learner Teaching','Test Preparation']::text[], array['hwy_safety','response_signs']::text[], 'both', true, 'CPD', false, true
where not exists (select 1 from public.learn_videos where url like '%iM0mqfSIj7U%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Ten Minute Takeaways: Adapting the lesson', 'Changing the plan when the pupil in front of you changes.', 11, 689, 'https://www.youtube.com/watch?v=r9YC_SVSslU', 'https://img.youtube.com/vi/r9YC_SVSslU/hqdefault.jpg', 133, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Learner Teaching','Instructor']::text[], array['progress']::text[], 'instructor', true, 'CPD', false, true
where not exists (select 1 from public.learn_videos where url like '%r9YC_SVSslU%');

insert into public.learn_videos (title, description, duration, duration_seconds, url, thumbnail_url, sort_order, kind, source, source_url, categories, topics, audience, is_bitesize, bitesize_category, is_featured, is_published)
select 'Are ADIs road safety professionals?', 'Framing the ADI role as a road safety profession.', 11, 669, 'https://www.youtube.com/watch?v=w6i6K4ysKO0', 'https://img.youtube.com/vi/w6i6K4ysKO0/hqdefault.jpg', 134, 'library', 'ADINJC', 'https://www.adinjc.org.uk/video-resource-hub/', array['CPD','Road Safety','Instructor']::text[], '{}'::text[], 'instructor', true, 'Road Safety', false, true
where not exists (select 1 from public.learn_videos where url like '%w6i6K4ysKO0%');
