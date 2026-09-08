# Phase 3 — Faster, more reliable Google sync

Phase 2 gave each imported Google event a permanent identity, so the diary no longer flickers. This phase makes the sync itself dependable: it stops missing events, only fetches what changed, and tells you honestly when something went wrong.

## Problems this fixes

1. **Events can be silently missed.** The sync asks Google for up to 2500 events in one go and ignores the "there is more" marker Google sends back. A busy calendar loses everything past that point — and that time then shows as free in Gap Filler.
2. **Every sync re-downloads eight months of calendar.** Slow, and wasteful of Google's rate limits.
3. **A failed sync leaves no trace.** If Google rejects the request or the connection has expired, nothing is recorded except a log line, and the diary keeps showing stale events as if they were current.
4. **An expired Google connection isn't reported.** When the refresh fails, the app keeps behaving as though it's still connected.

## What changes

- The sync reads through every page of results, so nothing is dropped no matter how full the calendar is.
- After the first full read, Google gives a "what changed since last time" token. Later syncs use it and only process changes — much faster. If Google says the token has expired, the sync automatically falls back to a full read.
- Each instructor gets a small record of sync state: last successful sync, the change token, and the last error. The Calendar Sync screen shows "Last synced ..." or the actual reason it failed, instead of a bare "Sync failed".
- If Google refuses the refresh (revoked or expired access), the connection is marked disconnected and the screen prompts you to reconnect.
- Deletions handled properly in incremental mode: when Google reports an event as cancelled, that one row is removed. The sweep that deletes everything not seen in the response only runs on a full read, never on an incremental one.

Not changing: how the diary displays events, lessons, pushing lessons to Google, SMS, pupil matching, the gap engine, or `capacitor.config.ts`.

## Technical detail

**Migration `db/067_google_sync_state.sql`** (all statements guarded)

- Add to `instructors`: `google_sync_token text`, `google_sync_error text`, `google_sync_error_at timestamptz`. Existing `calendar_last_synced` continues as the success timestamp. No new table, so no new grants or policies needed.

**`supabase/functions/sync-google-calendar/index.ts`**

- Wrap the events fetch in a `do/while` loop on `nextPageToken`, accumulating items.
- Request `syncToken` when one is stored (with `singleEvents=true`, no `timeMin`/`timeMax`/`orderBy`, per Google's rules); otherwise do the current windowed full read.
- On HTTP 410 (`fullSyncRequired`), clear the stored token and immediately retry as a full read.
- Store `nextSyncToken` from the final page on success; clear `google_sync_error`.
- Incremental mode: apply `status === 'cancelled'` items as targeted deletes by `external_event_id`; skip the stale sweep entirely.
- Full mode: keep the existing match-and-update plus windowed stale sweep from Phase 2.
- On any Google error or failed token refresh, write `google_sync_error` / `google_sync_error_at`, and on `invalid_grant` also set `google_calendar_connected = false`; return the message in the response.
- Keep EveryDriver-owned event filtering, London/all-day handling, and the Phase 2 identity fields.

**`src/routes/calendarsync.tsx`**

- Show last successful sync time, and the stored error when the last attempt failed, with a Reconnect prompt when the connection was marked disconnected. Presentation only.

## Verification

- Sync twice: the second run reports far fewer processed events and completes noticeably faster.
- Add, move and delete an event in Google; each is reflected after a sync, and the deleted one disappears.
- Confirm a Google event's time is still blocked in Gap Filler throughout.
- Full test suite and typecheck.

## After this phase

Sync is still triggered by the app rather than pushed by Google. Instant updates (webhooks), multiple calendars, booking-conflict protection and travel awareness remain as the later agreed phases.

## You will need to

Run `db/067_google_sync_state.sql` in Supabase and redeploy the `sync-google-calendar` function.
