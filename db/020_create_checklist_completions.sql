create table if not exists checklist_completions (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id),
  completed_at timestamptz default now(),
  items_checked jsonb
);

alter table checklist_completions enable row level security;

create policy "Instructor sees own checklists"
on checklist_completions for all
using (instructor_id = auth.uid());
