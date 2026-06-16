create table if not exists bulk_messages (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id),
  message_text text not null,
  recipient_count integer,
  recipient_ids jsonb,
  status text default 'queued',
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.bulk_messages to authenticated;
grant all on public.bulk_messages to service_role;

alter table bulk_messages enable row level security;

create policy "Instructor sees own bulk messages"
on bulk_messages for all
using (instructor_id = auth.uid());
