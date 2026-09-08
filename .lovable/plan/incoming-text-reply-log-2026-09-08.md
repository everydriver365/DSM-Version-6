# Incoming text reply log

Record every inbound text your Twilio number receives, and show it in the app so you can see exactly where a YES got lost.

## What you'll get

A new **Text replies** list (in Settings) showing, newest first:

- Time received
- Pupil name, or "Unknown number" with the raw number shown
- The message text
- What happened: signature rejected, no pupil match, saved to chat, offer accepted and lesson booked, clash so not booked, no open offer, or an error (with the reason)

Every inbound text is logged, including ones from numbers that don't match a pupil and ones rejected before matching, since those are the cases that hide a lost YES.

## How it works

1. New table `sms_inbound_log`: id, created_at, instructor_id (nullable), pupil_id (nullable), from_number, message_sid, body, outcome, detail (text), plus indexes on created_at and instructor_id. Grants + RLS: instructors read their own rows; service role full access. Unmatched rows (instructor_id null) are visible only to service role, and the app view shows a separate "unmatched" section fetched through a server function that returns only the last 50 unmatched entries (number, time, body) — no other account's data.
2. `supabase/functions/receive-sms/index.ts` writes one log row per inbound request at the point the outcome is known, using the existing service-role client. Logging is wrapped so a logging failure never breaks reply handling or booking.
3. New route `src/routes/textreplies.tsx` (under the authenticated area) lists the instructor's own rows, with a link from Settings.

## Constraints kept

- No change to `send-sms`, gap detection, pupil matching, Google Calendar, or `capacitor.config.ts`.
- Existing Supabase backend; no Lovable Cloud.
- Booking, offer closure and notification behaviour unchanged.

## Technical notes

- Migration file `db/070_sms_inbound_log.sql`, written with `if not exists` guards.
- Outcome values: `invalid_signature`, `no_pupil_match`, `logged_only`, `booked`, `clash`, `no_open_offer`, `error`.
- You'll need to run the SQL and redeploy `receive-sms` in Supabase; I'll paste both for you.
