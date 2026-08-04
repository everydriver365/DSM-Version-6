-- Notification delivery channel preferences (SMS / push master switches)
alter table public.notification_settings
  add column if not exists sms_enabled boolean default true,
  add column if not exists push_enabled boolean default true;
