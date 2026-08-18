# Backfill colours for past imported Google events

Imported Google events now store the event's Google colour in `calendar_blocks.colour`, but rows imported before that change still have no colour, so they render with the default blue accent. This adds a one-time backfill that re-fetches the last 90 days of Google events and updates the colour on those existing rows.

## Behaviour

- Runs automatically the first time a Google-connected instructor syncs after this change (no button, no extra taps).
- Range: events starting in the last 90 days up to now.
- Only touches rows created by the Google import (`source = 'external_calendar'`) that belong to the signed-in instructor, and only writes the `colour` column — titles, times and everything else are untouched.
- Marked as done per instructor once it completes, so it never re-runs on every sync.
- Silent on success; a failure is logged and ignored so it can never block a normal sync.

## Technical notes

New Supabase edge function `supabase/functions/backfill-google-colours/index.ts`:
- Authenticates the caller from the `Authorization` bearer, resolves their instructor id.
- Loads the stored Google credentials from `google_calendar_connections` (same source the existing sync uses), refreshing the access token if expired.
- Calls the Google Calendar events list with `timeMin` = now − 90 days, `timeMax` = now, `singleEvents=true`, paging through results.
- For each Google event, resolves `colorId` (falling back to the calendar's default colour) and updates the matching `calendar_blocks` row.
- Matching: use the stored Google event id column if `calendar_blocks` has one; the first implementation step is to confirm that column exists. If it does not, match on `instructor_id` + `source = 'external_calendar'` + exact `start_datetime` + `title`, and skip ambiguous matches rather than guessing.
- Returns `{ success, updated, scanned }`.

Client changes, limited to `src/routes/calendarsync.tsx` and a small helper:
- After a successful `sync-google-calendar` call, if the backfill has not run for this instructor, POST to `backfill-google-colours` and record completion.
- Completion flag stored alongside the existing sync preferences in `src/lib/calendarSyncPrefs.ts` (localStorage), matching how import/push toggles are already persisted.

No schema changes and no UI changes; `resolveEventColour` in `src/lib/googleCalendarColours.ts` already handles both raw colour ids and hex values, so the schedule and home timelines pick up the backfilled colours with no further work.
