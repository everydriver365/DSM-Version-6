# send-sms Edge Function

Processes the `sms_queue` table and sends queued messages via Twilio.

## Behavior

- Accepts `POST` requests (CORS enabled).
- Selects up to 50 rows from `sms_queue` where `status = 'queued'` and `scheduled_for <= now()`.
- Sends each via Twilio REST API.
- Updates row to `sent` (with `sent_at`) or `failed`.
- Returns `{ sent: number, failed: number }`.

## 1. Set Twilio environment variables

In the Supabase dashboard:

1. Go to **Project Settings → Edge Functions → Secrets** (or **Settings → Functions → Secrets**).
2. Add the following secrets:
   - `TWILIO_ACCOUNT_SID` — your Twilio Account SID (starts with `AC...`)
   - `TWILIO_AUTH_TOKEN` — your Twilio Auth Token
   - `TWILIO_FROM_NUMBER` — the Twilio phone number to send from, in E.164 format (e.g. `+447700900123`)

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

Alternatively, via CLI:

```bash
supabase secrets set \
  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx \
  TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxx \
  TWILIO_FROM_NUMBER=+447700900123 \
  --project-ref bjpqxfrihwjcqprmoqfs
```

## 2. Deploy

```bash
supabase functions deploy send-sms --project-ref bjpqxfrihwjcqprmoqfs
```

## 3. Schedule with pg_cron (every 5 minutes)

In the Supabase SQL editor, enable the required extensions (once) and create the cron job:

```sql
-- Enable extensions (only needed once per project)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the function to run every 5 minutes
select cron.schedule(
  'send-sms-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/send-sms',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SUPABASE_ANON_OR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Replace `YOUR_SUPABASE_ANON_OR_SERVICE_ROLE_KEY` with the project's anon key (or service role key if the function is not public). You can find these under **Project Settings → API**.

### Managing the cron job

```sql
-- View scheduled jobs
select * from cron.job;

-- View recent runs
select * from cron.job_run_details order by start_time desc limit 20;

-- Remove the schedule
select cron.unschedule('send-sms-every-5-min');
```

## 4. Manual invocation (for testing)

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_OR_SERVICE_ROLE_KEY" \
  https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/send-sms
```

Expected response:

```json
{ "sent": 3, "failed": 0 }
```
