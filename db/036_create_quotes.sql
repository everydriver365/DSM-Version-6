-- Quotes sent to enquiries / prospective pupils
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  recipient_name text not null,
  recipient_email text,
  recipient_phone text,
  course_type text,
  hours numeric,
  price numeric not null,
  deposit_amount numeric default 0,
  includes_test boolean default false,
  personal_message text,
  valid_until date,
  status text default 'pending',
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.quotes to authenticated;
grant all on public.quotes to service_role;

alter table public.quotes enable row level security;

drop policy if exists "Instructor manages own quotes" on public.quotes;
create policy "Instructor manages own quotes"
  on public.quotes for all
  to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());

create index if not exists quotes_instructor_idx
  on public.quotes (instructor_id, sent_at desc);
