# Why lesson bookings don't reach Google Calendar

## Diagnosis (verified in the code)

The app has **no way to write events into Google Calendar**. What exists is two things that only look like it:

1. **An outbound ICS feed** (`supabase/functions/ics-feed/index.ts`) — a read-only calendar file listing your lessons. Google can *subscribe* to it, but Google refreshes subscribed ICS feeds on its own schedule (often 8–24 hours, sometimes longer). Nothing you do in DSM pushes an update.
2. **An inbound importer** — `/calendarsync` lets you paste your Google "secret iCal address" so your personal events appear inside DSM. That direction is Google → DSM, not DSM → Google.

There is also a misleading function named `syncToGoogleCalendar` in `src/routes/lessons.new.tsx` (line 15) and `src/routes/lessons.$id.tsx` (line 20). Despite the name, it calls the **inbound** `sync-external-calendar` function and then simply opens `calendar.google.com` in a new tab. It never creates an event.

Additionally, `sync-external-calendar` is **not present in this repo** — `supabase/functions/` only contains `ics-feed`, `receive-sms`, `ryft-webhook`, `send-push`, `send-sms`. If it was never deployed to the Supabase project, even the inbound import fails silently (the code swallows the error).

No Google Calendar API code exists anywhere: no OAuth flow, no `calendar/v3` calls, no stored Google tokens.

## Options to actually make it work

**Option A — Real two-way sync via Google Calendar API (recommended)**
Connect Google Calendar per instructor through OAuth, then create/update/delete a Google event whenever a lesson is booked, moved, or cancelled. Store the Google event ID on the lesson row so edits and cancellations map to the right event. This is the only approach that puts a booking in Google Calendar within seconds.

**Option B — Fix and lean on the ICS feed**
Keep the current feed, remove the fake `syncToGoogleCalendar` calls, and set expectations in the UI that Google refreshes subscriptions slowly. Cheap, but bookings will still not appear immediately.

**Option C — Quick win only**
Add an "Add to Google Calendar" button on each lesson that opens a prefilled Google event-creation link. Manual, one event at a time, but instant and zero backend work.

## Technical notes

- Option A needs: a Google OAuth client, per-instructor token storage (encrypted, server-side), a server function to create/patch/delete events, and a `google_event_id` column on `lessons`.
- The Google Calendar App User Connector is available on this platform and would handle the per-user OAuth and token refresh, avoiding hand-rolled OAuth.
- Whichever option is chosen, the dead `syncToGoogleCalendar` helpers in `lessons.new.tsx` and `lessons.$id.tsx` should be removed or replaced, and the missing `sync-external-calendar` edge function should be confirmed deployed (or added) so the inbound import stops failing silently.

## Next step

Tell me which option you want and I'll write an implementation plan for it.
