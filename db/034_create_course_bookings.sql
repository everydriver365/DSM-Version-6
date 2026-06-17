-- Course bookings + instructor notifications
create table if not exists public.course_bookings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.instructor_courses(id) on delete cascade,
  instructor_id uuid references auth.users(id) on delete cascade,
  pupil_name text not null,
  pupil_email text,
  pupil_phone text,
  status text default 'confirmed',
  amount_paid numeric default 0,
  booked_at timestamptz default now()
);

grant select, insert, update, delete on public.course_bookings to authenticated;
grant all on public.course_bookings to service_role;

alter table public.course_bookings enable row level security;

drop policy if exists "Instructor manages own course bookings" on public.course_bookings;
create policy "Instructor manages own course bookings"
  on public.course_bookings for all
  to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());

create index if not exists course_bookings_course_idx
  on public.course_bookings (course_id, booked_at desc);

create table if not exists public.instructor_notifications (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text default 'info',
  read_at timestamptz,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.instructor_notifications to authenticated;
grant all on public.instructor_notifications to service_role;

alter table public.instructor_notifications enable row level security;

drop policy if exists "Instructor manages own notifications" on public.instructor_notifications;
create policy "Instructor manages own notifications"
  on public.instructor_notifications for all
  to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());

create index if not exists instructor_notifications_instructor_idx
  on public.instructor_notifications (instructor_id, created_at desc);
