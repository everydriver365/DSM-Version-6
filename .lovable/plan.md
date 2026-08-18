# Write Google event colours on every sync

Right now the import that creates `calendar_blocks` rows runs inside the deployed `sync-google-calendar` Supabase edge function, whose source is not in this project — so its insert cannot be changed from here. The colour pass added last time is a one-off backfill of the past 90 days.

This change turns that pass into a colour step that runs after every Google sync, so newly imported events get their Google colour too, not just historical ones.

## Behaviour

- After each successful Google sync (from the Calendar Sync page and from the sync button on the Schedule page), a colour pass runs automatically.
- Window: 90 days back to 180 days forward, so both past and upcoming imported events are covered.
- Only rows with `source = 'external_calendar'` belonging to the signed-in instructor are touched, and only the `colour` column is written.
- Rows whose colour already matches are skipped, so repeat syncs do no extra writes.
- Silent: it never blocks or fails a sync; problems are logged only.
- The existing "run once" flag is dropped — the pass is cheap and idempotent, and running it every sync is what keeps new events coloured.

## Technical notes

- `src/lib/calendarColourBackfill.server.ts`: accept a window (days back / days forward, defaulting to 90/180) instead of the fixed 90-day past window, and pass `timeMin`/`timeMax` through to the Google events list and the `calendar_blocks` query. Matching stays start-time + title, skipping ambiguous duplicates, since `calendar_blocks` has no Google event id column.
- `src/lib/calendarColourBackfill.functions.ts`: extend the input validator with the optional window fields.
- `src/routes/calendarsync.tsx`: run the pass after every successful Google sync rather than only when the one-off flag is unset.
- `src/routes/schedule.tsx`: run the same pass after its inline Google sync call so colours appear without visiting the Calendar Sync page.
- `src/lib/calendarSyncPrefs.ts`: remove the now-unused `getColourBackfillDone` / `setColourBackfillDone` helpers.

No schema changes and no UI changes. `resolveEventColour` already renders whatever colour lands in the column.

## Note on the real fix

The durable fix is for `sync-google-calendar` itself to write `colorId` at insert time. If you can share or move that edge function into this project, the colour pass can then be removed entirely.
