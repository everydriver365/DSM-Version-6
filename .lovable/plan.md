# Remove leftover ICS wording and routing from calendar sync

The "Sync failed — check your calendar URL in Settings" message you saw comes from the Schedule page, not the Calendar Sync page. Schedule still has the old ICS path in it: it checks `external_calendar_url`, falls back to the `sync-external-calendar` endpoint, and uses the ICS-era error copy. The background sync in the app shell does the same.

## What changes

### 1. Schedule page (`src/routes/schedule.tsx`)
- Sync gate checks only `google_calendar_connected`; if not connected, keep the existing "Connect a calendar first" behaviour and send the user to Calendar Sync.
- Always call `sync-google-calendar` — drop the `sync-external-calendar` fallback and the `external_calendar_url` payload/logging.
- Replace the failure copy with a Google-accurate message: "Sync failed — reconnect Google Calendar in Settings" (with the real edge-function error surfaced when it returns one).
- Stop selecting `external_calendar_url` from `instructors` and drop it from local state/types.
- Leave the calendar-block reads alone: imported rows are stored with `source = 'external_calendar'`, which is just the stored value for imported events, not the ICS feature.

### 2. App shell background sync (`src/routes/__root.tsx`)
- The silent background sync currently reads `external_calendar_url` and posts to `sync-external-calendar`. Change it to check `google_calendar_connected` and post to `sync-google-calendar`, staying silent on failure as it is today.

### 3. Other stale ICS callers
- `src/routes/lessons.$id.tsx` and `src/routes/home.tsx` both fire `sync-external-calendar`. Point both at `sync-google-calendar` so no code path can produce an ICS-flavoured failure.
- `src/routes/settings.tsx` shows "last synced" from `external_calendar_last_synced_at`; switch it to `calendar_last_synced`, which is what the Google flow writes.

## Not changing

Calendar Sync page (already Google-only), the Google OAuth connect/disconnect flow, the `calendar_blocks` schema or its `source` value, colour backfill, and lesson push.
