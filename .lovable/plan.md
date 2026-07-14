# ICS Feed & Calendar Sync — Read-only Report

## 1. Does `src/routes/calendarsync.tsx` show an ICS feed URL for the instructor?
Yes. Lines 212–214 build a per-instructor URL from the logged-in `userId` and display it in the "YOUR ICS FEED URL" section (line 494) with copy/share buttons.

## 2. Exact URL format
```
https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/ics-feed?instructor_id=<userId>
```
Placeholder shown before auth loads: `…?instructor_id=…`. No token/signature — only the instructor's UUID is required.

## 3. Does adding a lesson in DSM trigger an ICS feed refresh?
**No.** No code in `src/` references `ics-feed` outside `calendarsync.tsx` (grep confirms only the 7 hits in that file — display, copy, share). Lesson create/update/delete paths never call the function or invalidate anything ICS-related.

The feed is pull-only: whoever subscribed (Google/Apple/Outlook) fetches on their own schedule. The edge function also sets `Cache-Control: public, max-age=300` (line 155), so intermediate caches may hold the response for up to 5 minutes.

## 4. Any webhook or trigger on the `lessons` table?
**No.** `supabase/migrations/` is empty and `supabase/functions/` contains only `ics-feed`, `send-push`, `send-sms` — none reference the lessons table via trigger or pg_net webhook. Nothing fires on lesson changes.

## 5. `supabase/functions/ics-feed/index.ts` — exists and behavior
Exists (158 lines). Behavior:
- `GET /functions/v1/ics-feed?instructor_id=<uuid>` (OPTIONS for CORS; other methods → 405).
- Requires `instructor_id` query param (400 if missing).
- Creates a Supabase client with `SUPABASE_SERVICE_ROLE_KEY` (falls back to anon), so it bypasses RLS.
- Selects from `lessons`: `id, lesson_date, lesson_time, duration_minutes, status, pupil_id, pupils(name)` where `instructor_id = ?`, `deleted_at IS NULL`, `status != 'cancelled'`, ordered by date/time.
- Converts London wall-clock (`lesson_date` + `lesson_time`) to UTC, handling both GMT and BST.
- Emits an RFC 5545 VCALENDAR with one VEVENT per lesson: `UID:<lesson_id>@everydriver.co.uk`, `DTSTAMP/DTSTART/DTEND` in UTC, `SUMMARY:"<PupilName> - Driving lesson"`, description with duration + status. Text is escaped and long lines folded per RFC 5545.
- Response headers: `Content-Type: text/calendar; charset=utf-8`, `Content-Disposition: attachment; filename="dsm-lessons.ics"`, `Cache-Control: public, max-age=300`, CORS `*`.

## Summary
The ICS feed is a passive, on-demand endpoint. DSM does nothing when lessons change — updates propagate only when the subscribing calendar app next polls, subject to its own refresh interval (Google Calendar typically re-fetches external ICS feeds every several hours to a day) and the 5-minute `Cache-Control` window. There are no triggers, webhooks, or client-side invalidations tied to lesson mutations.

### Observations worth flagging (not fixes)
- URL exposes lessons to anyone who knows the `instructor_id` UUID — no signed token.
- Service-role key bypasses RLS inside the function.
- Query selects `pupils(name)` — confirm the `pupils` table has a `name` column (schema elsewhere uses `first_name` / `last_name`), otherwise `pupilName` silently falls back to `"Pupil"`.
