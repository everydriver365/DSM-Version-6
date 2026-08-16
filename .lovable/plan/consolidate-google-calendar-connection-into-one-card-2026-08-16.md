# Consolidate Google Calendar connection into one card

Only two files change: `src/routes/calendarsync.tsx` (all the work) and `src/routes/schedule.tsx` (verify only — its condition already reads the mirrored `instructors.google_calendar_connected`, so it stays exactly as-is).

## The duplication being removed (verified in calendarsync.tsx)

| Today | Lines | Becomes |
| --- | --- | --- |
| `connectGoogle()` — OAuth via `supabase.functions.invoke`, opens `_system`, writes `google_calendar_connections` | 289 | deleted |
| `connectGoogleCalendar()` — OAuth via `fetch` to the same `google-calendar-auth`, redirects `window.location` | 337 | **kept, unchanged** |
| `disconnect()` — clears the `instructors` mirror columns only | 389 | **kept, extended** to clear both stores |
| `disconnectGoogle()` — deletes the `google_calendar_connections` row, nulls `google_event_id` | 317 | folded into `disconnect()` |
| `syncNow()` — always hits `sync-google-calendar` | 361 | folded into `sync()` |
| `runSync(url)` — ICS path, hits `sync-external-calendar` | 407 | kept for the ICS advanced block only |

Two OAuth connect buttons render today (the connected/not-connected card at ~line 610-720, and a second outbound card at ~line 856-905). Both go away in favour of one card.

## New behaviour

**Single `sync()`** — reads the session, routes to `sync-google-calendar` when `googleConnected` else `sync-external-calendar`, posts `{ instructorId: userId }` with apikey + bearer headers, treats `data.success` or a present `data.eventsImported` as success, toasts `Synced N events`, sets `lastSynced`. Errors fall back to `data.message ?? data.error ?? "Sync failed"`.

**Single `disconnect()`** — deletes the `google_calendar_connections` row for the instructor, then nulls the `instructors` mirror columns (`google_calendar_connected`, `google_access_token`, `google_refresh_token`, `google_calendar_id`, `google_token_expiry`), clears local state and toasts.

**One OAuth-return handler** — accepts every existing param shape (`?calendar=connected`, `?connected=google`, `?calendar=error`, `?error=...`) so whatever the deployed edge function redirects with still works; on success it toasts, marks connected, strips the query string, and auto-syncs after 1.5s.

## New UI

Section label **GOOGLE CALENDAR**, then one white card (16px radius, 1px `#E4E8EF` border, overflow hidden).

Connected:
```text
[ 40px green circle ]  Google Calendar            [ Connected ]
                       Last synced …
------------------------------------------------------------
Import Google events into DSM                      [toggle]
Push DSM lessons to Google                         [toggle]
Sync now                                           (spinner while syncing)
Disconnect Google Calendar                         (red)
```
Not connected: a single tappable row — blue calendar circle, "Connect Google Calendar" / "Import events and push lessons automatically", chevron (or "Connecting…").

New state: `importEnabled` (true), `pushEnabled` (true), `showICS` (false). The two toggles use the existing `DSMToggle` and are local preferences in this pass — no change to lesson push logic or edge-function payloads.

Below the card: a small grey "Use a custom ICS link instead" disclosure with a rotating chevron; expanding it reveals the existing ICS URL input, save, sync and status UI **unchanged**.

## Not changing

`connectGoogleCalendar`, the `SUPABASE_URL` / `SUPABASE_ANON_KEY` constants, the ICS logic itself, all lesson-push calls (`google-calendar-sync` from lessons.new / lessons.edit / AddLessonSheet / cancelLesson), and every edge-function contract — only which endpoint the sync button routes to.
