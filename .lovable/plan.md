# Phase 2 — Stable identity for imported Google events

Your database reported its time zone as UTC, which is what the time handling needed. The rest of the query only returned that one line because the Supabase SQL editor shows the result of the last statement in a multi-statement script. Rather than send you back to run six separate queries, this phase is written defensively: every structural change checks whether the column or index already exists before adding it, so it is safe whatever the current shape is.

## The problem this fixes

Imported Google events are currently wiped and re-inserted on every sync. Nothing ties a stored row back to the specific Google event it came from. That causes:

- duplicate or flickering entries in the diary during a sync
- events briefly disappearing from availability, so Gap Filler can offer time that is actually busy
- no way to know when an event was last updated, so a cancelled or moved event can linger

## What changes

1. Give each imported event a permanent link to its Google counterpart, plus which Google calendar it came from and when it was last seen.
2. Replace the wipe-and-reinsert sync with a match-and-update: existing events are updated in place, new ones added, and only events that Google says are gone or cancelled are removed.
3. Prevent the same Google event being stored twice for the same instructor.
4. Keep EveryDriver's own lessons out of the imported list, using the marker added in the previous phase.

Nothing about how the diary displays events changes. Nothing about lessons, SMS, pupil matching or the gap engine changes.

## Technical detail

**Migration (all statements guarded with `if not exists` / `where not exists`)**

- `calendar_blocks`: add `external_event_id text`, `external_calendar_id text`, `external_updated_at timestamptz`, `last_synced_at timestamptz`.
- Backfill: leave existing rows as-is; they are replaced on the next sync.
- Unique partial index on `(instructor_id, external_calendar_id, external_event_id)` where `source = 'external_calendar'` and `external_event_id is not null`.
- Supporting index on `(instructor_id, source, start_time)`.
- No table creation, so no new grants or policies are required; existing `calendar_blocks` RLS continues to apply.

**`supabase/functions/sync-google-calendar/index.ts`**

- Stop deleting all `external_calendar` rows up front.
- Upsert each event on the new unique key, writing `external_event_id`, `external_calendar_id`, `external_updated_at` (Google's `updated`), and `last_synced_at`.
- Delete only rows whose `external_event_id` appears in Google's response as `status = 'cancelled'`, plus rows in the synced window whose `last_synced_at` is older than the current run.
- Keep the existing skip for EveryDriver-owned events (private marker or matching `lessons.google_event_id`).
- Keep the existing all-day and Europe/London conversion.

**Not touched:** `push-lesson-to-google`, `send-sms`, `src/lib/gapDetection.ts`, `src/lib/pupilMatching.ts`, the Schedule display, `capacitor.config.ts`.

## Verification

- Run a sync twice in a row and confirm the diary shows each Google event exactly once with no flicker.
- Confirm a Google event's time is still blocked in Gap Filler across the sync.
- Delete an event in Google, sync, confirm it disappears in EveryDriver.
- Full test suite and typecheck.

## Known limits after this phase

Sync is still polling-based — changes in Google appear on the next sync, not instantly. Incremental sync tokens, webhooks and multiple-calendar support remain in the later phases of the agreed plan.
