# Google Calendar & Availability — Architecture Plan

Audit done, nothing changed yet. Both bugs you described are confirmed with an exact cause.

## 1. Current architecture

```text
Google OAuth  -> google-calendar-auth / google-calendar-callback
                 tokens saved on the instructors row (google_access_token etc.)
                 calendar id hard-set to "primary"

Google -> ED   sync-google-calendar (polling only, no push/webhooks)
                 pulls -60 to +180 days, every event, every time
                 DELETES all external_calendar rows, re-INSERTS them
                 -> calendar_blocks (no Google event id stored)

ED -> Google   push-lesson-to-google
                 create/update via lessons.google_event_id  (mapping exists)
                 delete via sync-google-calendar action="delete"

Availability   calendar_blocks + lessons + blocks + time off -> computeDayGaps()
```

There are **no Google webhooks at all**, no sync tokens, no channels. Sync is triggered from the app: on open (15-minute throttle), on Schedule/Home load, and from the Sync now button.

## 2. Exact duplicate-event cause

Three faults compounding:

1. **The import pulls back our own lessons.** When EveryDriver pushes a lesson to Google, that event lives in the same calendar. The importer takes every event in the window and never checks it against `lessons.google_event_id`, so each lesson returns as an "external busy" record.
2. **The only defence is a display trick.** `src/lib/calendarDedupe.ts` hides an imported event if it starts within 5 minutes of a lesson. The row still exists in the database and still marks that time as busy for Gap Filler.
3. **In summer that trick fails**, because the pushed event is an hour out (see below) — 60 minutes apart, 5-minute tolerance. So the lesson appears twice.

Separately, `calendar_blocks` has no column holding the Google event id, so nothing can be matched or updated by key; the importer wipes and re-inserts everything, which also loses the assigned colours and churns rows for 1,600 instructors. A past migration (`db/064`) refers to a unique constraint `calendar_blocks_external_unique` that no repo migration creates.

## 3. Exact timezone cause

`supabase/functions/push-lesson-to-google/index.ts` lines 72–73:

```text
new Date("2026-07-01T10:00")   -> read as UTC on the server
.toISOString()                 -> "2026-07-01T10:00:00Z"
sent as dateTime + timeZone: "Europe/London"
```

When a time already carries a `Z`, Google ignores the timeZone field. So a 10:00 lesson in British Summer Time lands in Google at 11:00. In winter it looks fine, which is why it seems intermittent. Incoming events are stored correctly (Google supplies the offset), except all-day events, which are written without one.

## 4. Other confirmed problems

- **Two token stores**: the edge functions read `instructors.google_*`, the settings screen reads a `google_calendar_connections` table. They can disagree — a likely source of "Sync failed".
- **One calendar only** — fixed to `primary`, no selection, no per-calendar busy/write roles.
- **No double-booking protection anywhere.** Five places create lessons and none check for a clash; the database has no guard either.
- **Untracked schema**: `lessons.google_event_id`, all `instructors.google_*` columns, `google_calendar_connections`, `gap_filler_offers`, pupil availability tables and the instructor block/time-off tables have no migration in the repo.

## 5. Proposed work, in order

**Phase 0 — Schema baseline (no behaviour change).** Read the live database, write it down as a baseline migration, and show it to you before anything runs. Everything after this depends on it.

**Phase 1 — Timezone fix.** Send lessons to Google as plain local wall-clock time plus `Europe/London`, never a `Z` instant. Fix all-day imports. Add tests across GMT, BST and both changeover weekends.

**Phase 2 — Event identity.** Add a stable Google event id (and calendar id, updated stamp) to `calendar_blocks`, with a real unique key. Stamp every event EveryDriver creates with a private marker so it is recognisably ours. Import becomes update-by-key instead of wipe-and-replace, and skips anything marked as ours or matching a known lesson. Retire the 5-minute guessing filter.

**Phase 3 — Sync reliability.** Store a sync token per calendar and pull only changes. Add `sync_status` (pending/synced/failed) on lessons so a Google failure never leaves a lesson half-created or duplicated, plus a retry path.

**Phase 4 — Google push notifications.** Register watch channels per calendar, store channel and resource ids, renew before expiry, ignore replays and out-of-order deliveries by reconciling against the stored token rather than trusting the notification. Handled through a public webhook route with verification.

**Phase 5 — Multiple calendars.** Store the connected account, each calendar's id, name, whether it contributes busy time, and which one receives lessons. Rebuild Calendar Settings to match your section 19, with the "EveryDriver is the master system" wording.

**Phase 6 — Booking safety.** One shared availability check used by Home, Schedule, Gap Filler and booking, plus a final check inside a database function with a real constraint, so two people booking the same slot gives one success and one clear rejection. Includes a pupil-clash check.

**Phase 7 — Travel time.** Only after the above; changes the meaning of a gap for everyone.

## 6. Files that will change

Backend: `push-lesson-to-google`, `sync-google-calendar`, `google-calendar-auth`, `google-calendar-callback`, plus a new webhook route and new watch/renew jobs.
App: `src/routes/calendarsync.tsx`, `src/lib/calendarDedupe.ts` (removed), `src/lib/gapDetection.ts`, `src/routes/gaps.tsx`, `home.tsx`, `schedule.tsx`, and the five lesson-creation places (`lessons.new.tsx`, `courses.$id.tsx`, `messages.$pupilId.tsx`, `AddLessonSheet.tsx`, `lesson-series.tsx`).

## 7. Database changes required

Baseline first, then: `calendar_blocks` gains external event id / calendar id / updated marker + unique key; `lessons` gains `sync_status`; a calendars table (account, calendar id, name, busy-source flag, target flag, sync token, channel details); an overlap guard on lessons. Every one shown to you before it runs, with a rollback.

## 8. Google API changes

Scope stays `calendar.events` plus `calendar.readonly` for listing calendars; add incremental sync tokens, `extendedProperties.private` markers on our events, and `events.watch`/`channels.stop` for push. No more full 240-day re-imports.

## 9. Testing

Your eight scenarios become automated tests where possible (identity, replay, edit, cancel, external event, timezone incl. DST) plus a real end-to-end run on your own connected calendar for the webhook and multi-calendar cases.

## 10. Risks

- Live schema is unknown until Phase 0; any migration before that is guesswork.
- Existing duplicate blocks need a one-off clean-up, and existing pushed events may be an hour out — they will need re-pushing after Phase 1.
- Push notifications need a stable public URL and channel renewal; if it lapses, sync must fall back to polling rather than silently stop.
- Removing the 5-minute filter before Phase 2 lands would make duplicates visible, so those two ship together.

## Suggested first step

Phase 0 + Phase 1 only: document the real schema, and fix the one-hour summer shift. Small, verifiable, and it unblocks everything else.
