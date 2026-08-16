# Why there are several Google Calendar connections — and how to reduce it to one

## What's actually there (read from `src/routes/calendarsync.tsx`)

The Calendar sync page currently renders **three separate connection mechanisms**, built at different times, all still live:

1. **Google OAuth (inbound)** — "Connect Google Calendar" button (`connectGoogleCalendar`) → edge function `google-calendar-auth`, then `sync-google-calendar` imports Google events into `calendar_blocks`. State lives on the `instructors` row: `google_calendar_connected`, `google_access_token`, `google_refresh_token`, `google_calendar_id`, `google_token_expiry`. Disconnect = `disconnect()`.
2. **ICS URL (inbound)** — paste a Google "secret iCal address" into `external_calendar_url`, "Sync now" calls `sync-external-calendar`. This predates the OAuth flow and does the same job, less well.
3. **Google OAuth (outbound)** — a second connect button (`connectGoogle` / `disconnectGoogle`) that hits the **same** `google-calendar-auth` function but stores state in a different place: the `google_calendar_connections` table. This is the one that pushes DSM lessons out to Google (`google-calendar-sync`, called from lessons.new, lessons.edit, AddLessonSheet, cancelLesson).

So there are two connect buttons calling the same OAuth endpoint but recording the result in two different stores, plus a legacy ICS path. That's why it feels duplicated — and why one can look "connected" while the other looks "not connected".

Other places that inherit the mess:
- `src/routes/schedule.tsx` sync button branches on `google_calendar_connected` vs `external_calendar_url` and picks a different endpoint.
- `src/routes/home.tsx`, `src/routes/lessons.$id.tsx`, `src/routes/__root.tsx` all call `sync-external-calendar` directly.

## Proposed cleanup

**One connection, two directions.** Keep a single "Google Calendar" card with one Connect/Disconnect control, and under it two toggles: *Import Google events into DSM* and *Push DSM lessons to Google*. ICS stays but demoted to a collapsed "Advanced: connect by ICS link instead" row, for users who don't want to grant OAuth.

Concretely:
- Pick `google_calendar_connections` as the single source of truth for OAuth state; treat `instructors.google_calendar_connected` as a read-only mirror kept in sync so existing checks (schedule.tsx) keep working, or update those checks to read the table.
- Delete the duplicate `connectGoogle` + `connectGoogleCalendar` pair — keep one, with the session-token check already added.
- Delete the duplicate `disconnect` + `disconnectGoogle` pair — one function that clears both stores and nulls `google_event_id` on future lessons.
- Delete `syncNow` vs `runSync` duplication: one `sync()` that routes to `sync-google-calendar` when OAuth is connected, `sync-external-calendar` when only an ICS URL is set.
- Simplify the OAuth-return query-param handling — it currently handles three different param shapes (`?calendar=connected`, `?connected=google`, `?error=...`) because each flow used its own.

## Technical notes

- The edge functions (`google-calendar-auth`, `sync-google-calendar`, `google-calendar-sync`, `sync-external-calendar`) are deployed but **not in this repo** (`supabase/functions/` only has ics-feed, receive-sms, send-push, send-sms). This plan changes frontend only; the callback URL used by `google-calendar-auth` must keep working with whichever query params we keep, so the safest move is to keep accepting all three param shapes and only unify the UI.
- Files touched: `src/routes/calendarsync.tsx` (main), `src/routes/schedule.tsx` (connection check reads one source), and optionally `src/routes/home.tsx` / `src/routes/lessons.$id.tsx` / `src/routes/__root.tsx` if we want their background sync calls to route the same way.
- No database migration required; no change to how lessons are pushed out.

## Decision needed

Do you want the full consolidation above, or just the minimal fix — remove the second, duplicate Connect button so there's one Google button plus the ICS fallback?
