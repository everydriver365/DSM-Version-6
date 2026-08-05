-- Add a channel source to chat_messages so SMS replies can be counted separately from in-app messages.
alter table public.chat_messages
  add column if not exists source text default 'app';

comment on column public.chat_messages.source is 'Channel the message came from: app or sms';

-- Index for unread message filtering by instructor and source.
create index if not exists chat_messages_instructor_source_idx
  on public.chat_messages (instructor_id, source, sender_type, read_at);
