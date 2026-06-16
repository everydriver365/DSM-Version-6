create table if not exists notification_settings (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) unique,
  lesson_booked boolean default true,
  lesson_reminder_24h boolean default true,
  lesson_reminder_1h boolean default true,
  lesson_cancelled boolean default true,
  lesson_rescheduled boolean default true,
  payment_received boolean default true,
  outstanding_reminder boolean default true,
  new_enquiry boolean default true,
  new_review boolean default true,
  quiet_from time default '22:00',
  quiet_to time default '07:00',
  updated_at timestamptz default now()
);

grant select, insert, update, delete on public.notification_settings to authenticated;
grant all on public.notification_settings to service_role;

alter table notification_settings enable row level security;

create policy "Instructor manages own notification settings"
on notification_settings for all
using (instructor_id = auth.uid());
