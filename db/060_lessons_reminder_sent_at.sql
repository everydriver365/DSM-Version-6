-- Track when an automated reminder push was sent for a lesson
alter table public.lessons
  add column if not exists reminder_sent_at timestamptz;

create index if not exists lessons_reminder_sent_at_idx
  on public.lessons (reminder_sent_at);
