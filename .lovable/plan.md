# Google event colours on the schedule accent line

Imported Google events currently always render with the same blue accent (`#4AABDB` in `src/routes/schedule.tsx`), even though the tile code already supports a per-event `colour`. Two things are missing: the colour is never fetched, and it's not certain the importer stores Google's colour at all.

## What's verified

- `public.calendar_blocks` already has a `colour` text column (`db/058_personal_calendar_events.sql`).
- The schedule's external-events fetch (`schedule.tsx` ~line 803) selects only `id, start_datetime, end_datetime, title` — `colour` is never read.
- The external tile (~line 2913) already does `entry.colour ?? "#4AABDB"`, so once a colour arrives it will show on the accent bar.
- The Google sync edge function is not in this repo (only `ics-feed`, `receive-sms`, `send-push`, `send-sms` exist locally), so whether it writes Google's `colorId` into `colour` is **unconfirmed**.

## Plan

1. **Check what's stored.** First step of the work: read a few `external_calendar` rows and see whether `colour` is populated. This decides whether step 3 is needed.

2. **New helper `src/lib/googleCalendarColours.ts`** — maps Google Calendar's `colorId` values (1–11: Lavender, Sage, Grape, Flamingo, Banana, Tangerine, Peacock, Graphite, Blueberry, Basil, Tomato) to their hex values, plus a `resolveEventColour(value)` that accepts either a numeric colorId or an existing `#hex` and returns a hex, defaulting to the current blue.

3. **Importer (only if step 1 shows no colour stored).** The Google sync function must request `colorId` on the events list and write the resolved value into `calendar_blocks.colour` on insert/update. Since that function lives outside this repo, this step is done by adding/updating it under `supabase/functions/` and redeploying — flagged separately before touching it.

4. **`src/routes/schedule.tsx`** — add `colour` to the external-blocks `select`, carry it through into the `external` agenda entry (the type already has `colour`), and pass it through `resolveEventColour` where the accent colour is computed (tile ~2913 and the marker at ~1878).

5. **`src/routes/home.tsx`** — same select + accent change for the today/tomorrow timeline rows, so both screens match.

## Notes

- No DB migration needed; `colour` already exists.
- Personal DSM events keep their amber accent; only `source = 'external_calendar'` rows change.
- If the importer can't be updated, the fallback stays exactly as today (single blue), so nothing regresses.
