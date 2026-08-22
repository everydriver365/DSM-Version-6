-- PayPal.me + bank transfer payment methods for instructors
alter table public.instructors add column if not exists paypal_me_username text;
alter table public.instructors add column if not exists bank_account_name text;
alter table public.instructors add column if not exists bank_sort_code text;
alter table public.instructors add column if not exists bank_account_number text;
alter table public.instructors add column if not exists active_payment_method text default 'square';
