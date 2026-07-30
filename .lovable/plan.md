# Why Google events come in but lessons don't go out

## What the code actually does today

Reading Google → DSM (works):
- On Calendar sync you paste your Google Calendar **secret ICS URL** (`calendarsync.tsx`).
- It's stored on `instructors.external_calendar_url`.
- On every app load, `__root.tsx` silently calls the `sync-external-calendar` edge function, which fetches that ICS and writes rows into `calendar_blocks` with `source = 'external_calendar'`.
- Home and Schedule read those rows and interleave them into the timeline.

Writing DSM → Google (doesn't work, and can't with the current setup):
- The only outbound path is the `ics-feed` edge function — a read-only calendar feed you subscribe to in Google. Subscribed feeds are one-way and Google refreshes them on its own schedule (often 8–24 hours), so new lessons appear late or not at all.
- `syncToGoogleCalendar()` in `home.tsx`, `lessons.new.tsx` and `lessons.$id.tsx` is misleading: it just re-runs the *inbound* import and then opens calendar.google.com in a new tab. It never creates an event.

So the asymmetry is by design of the two mechanisms used: ICS-in is a fetch we control, ICS-out is a subscription Google controls. Writing events requires the Google Calendar API with each instructor's OAuth authorisation — which the app has never had.

## Proposed fix: real one-way push to Google (per instructor)

Add per-instructor Google authorisation and write lessons into their Google Calendar immediately on create, edit, cancel and delete. Inbound ICS import stays exactly as it is.

### Steps

1. **Connect Google per user** — set up the Google Calendar App User Connector so each instructor authorises their own Google account from the Calendar sync page (scope: `calendar.events`). Store each user's connection handle server-side, encrypted, keyed by instructor id.
2. **Track the link** — new table `google_calendar_links` (instructor_id, connected_at, target calendar id, encrypted connection key) and a `google_event_id` column on `lessons` so we can update/delete the right Google event later.
3. **Server functions** (`src/lib/googleCalendar.functions.ts`) calling the Google Calendar API through the connector gateway:
   - `pushLesson` — insert or patch an event (summary "Pupil name — Driving lesson", start/end from `lesson_date` + `lesson_time` + duration, Europe/London timezone, pickup address as location, notes as description); saves `google_event_id`.
   - `removeLesson` — delete the Google event on cancel/delete.
   - `backfillLessons` — push all future lessons once, right after connecting.
4. **Wire the triggers** — call `pushLesson` after a successful save in `lessons.new.tsx`, `AddLessonSheet.tsx`, `lessons.edit.$id.tsx` / reschedule, and `removeLesson` from the cancel/delete sheets. Failures never block the save; they toast quietly and log.
5. **Clean up the lie** — delete `syncToGoogleCalendar()` and its buttons in `home.tsx`, `lessons.new.tsx`, `lessons.$id.tsx`.
6. **Calendar sync page** — split into two clear sections: "Bring Google events into DSM" (existing ICS paste, unchanged) and "Send DSM lessons to Google" (Connect / Connected as … / Disconnect, last push time, and a note that the old ICS subscribe link is still available but slow).

### Technical notes

- Google writes go through the Lovable connector gateway from server functions only — no Google credentials in browser code.
- Timezone: lessons store London wall-clock date/time; events are sent with an explicit `Europe/London` timeZone rather than converted to UTC, so BST is handled by Google.
- Deletes are idempotent: a missing `google_event_id` or a 404 from Google is treated as success.
- Requires a Google OAuth web client configured once at workspace level with the Lovable gateway callback registered as the redirect URI.
