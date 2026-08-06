-- Allow the recipient of a direct instructor message to mark it as read.
-- Without this policy the client UPDATE silently affects 0 rows, so unread
-- badges never reset after opening an instructor conversation.

alter table public.instructor_messages enable row level security;

drop policy if exists "Recipient can mark instructor messages read" on public.instructor_messages;
create policy "Recipient can mark instructor messages read"
  on public.instructor_messages
  for update
  to authenticated
  using (to_instructor_id = auth.uid())
  with check (to_instructor_id = auth.uid());

grant select, insert, update on public.instructor_messages to authenticated;
grant all on public.instructor_messages to service_role;

-- Fallback RPC: marks every unread message addressed to the caller in a
-- conversation as read, regardless of policy nuances.
create or replace function public.mark_instructor_messages_read(_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated integer;
begin
  update public.instructor_messages
     set read_at = now()
   where conversation_id = _conversation_id
     and to_instructor_id = auth.uid()
     and read_at is null;
  get diagnostics updated = row_count;
  return updated;
end;
$$;

grant execute on function public.mark_instructor_messages_read(uuid) to authenticated;

create index if not exists instructor_messages_unread_idx
  on public.instructor_messages (to_instructor_id, read_at);
