# Remove ICS calendar, keep Google Calendar only

Google Calendar now handles everything ICS was doing, so both ICS features are removed and previously imported ICS events are deleted.

## What changes for you

- The Calendar sync screen loses the "paste another calendar's link" box and the shareable EveryDriver calendar link. Google Calendar connection, calendar selection and instant updates stay exactly as they are.
- Events previously imported from your ICS link are removed, so only Google events (plus your lessons, blocks and time off) block your time.
- Schedule, Gap Filler and double-booking protection keep working unchanged — they simply stop looking for ICS events.
- The help text that pointed at "ICS feed sync" is reworded to Google Calendar.

## Technical changes

1. `src/routes/calendarsync.tsx` — remove ICS state, the instructor `ics_feed_url` / `ics_feed_status` / `ics_last_fetched_at` reads and writes, the outbound feed URL + copy action, and both ICS UI cards. Keep all Google logic untouched.
2. `src/routes/schedule.tsx` — drop the `sync-ics-feed` invocation path; narrow the `calendar_blocks` query to `source = 'external_calendar'`. Rename the local `icsBlocks` state to a neutral name.
3. `src/routes/gaps.tsx`, `src/routes/home.tsx`, `src/lib/bookingConflicts.ts` — narrow `.in("source", ["ics_inbound", "external_calendar"])` to `.eq("source", "external_calendar")`. No other engine changes.
4. `src/routes/__root.tsx` — remove the background ICS poll/throttle block if it exists solely for ICS.
5. `src/routes/help.tsx` — update the calendar sync wording.
6. Delete edge functions `supabase/functions/sync-ics-feed/` and `supabase/functions/ics-feed/` from the project. Removing them from the Supabase dashboard is a manual step for you (optional; they become unused either way).
7. Data cleanup: a one-off `DELETE FROM calendar_blocks WHERE source = 'ics_inbound'` plus clearing the instructor ICS columns. Provided as SQL for you to run — no schema change, columns stay in place so nothing else breaks.
8. Tests in `src/lib/gapDetection.test.ts` that reference ICS events are kept but relabelled to external calendar events; the engine behaviour is unchanged.
9. `capacitor.config.ts` untouched. No changes to Google sync, SMS, pupil matching, or the gap engine logic.

## Verification

Full test suite and typecheck; confirm Schedule still shows Google events and Gap Filler still treats them as busy.
