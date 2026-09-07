# Fix: Gap filler says it can't load your diary

## What the investigation found

Your diary itself is fine — lessons, pupils and calendar events all belong to
your signed-in account and every other page reads them the same way, which is
why Schedule and Home look correct.

The difference is how Gap filler reads your **profile settings** (working
hours, working days, per-day hours, travel buffer, hourly rate):

- Schedule (`src/routes/schedule.tsx`, lines 1058-1075) asks for those settings,
  and if the request fails it quietly retries with fewer fields, and if there is
  still no profile row it just carries on with sensible defaults.
- Home (`src/routes/home.tsx`, lines 3420-3424) does the same: no profile row
  simply means defaults.
- Gap filler (`src/routes/gaps.tsx`, lines 194-212) instead treats it as fatal:
  if that single request errors or returns no row, it throws and the whole page
  becomes "We couldn't load your diary".

So one settings request failing — a field the profile table doesn't have, or no
profile row for the account — stops the entire Gap filler even though every
piece of diary data loaded perfectly. That matches exactly what you see:
everything else fine, Gap filler blank.

I can't sign in as you from here, so I can't name which field or row is
missing; the fix removes the dependency altogether and reports the detail if
anything else ever fails.

## The fix

1. Treat working hours and settings as optional in Gap filler, exactly like
   Schedule and Home: retry with a reduced set of fields, and fall back to
   09:00-18:00, Monday-Friday, no travel buffer if there is still nothing.
   Nothing about the gap maths changes.
2. Only sign-in problems and a genuine failure to read your lessons can stop
   the page now.
3. Keep the small detail line under the error so any future failure names
   itself, and make sure it is always filled in (never an empty line).
4. Two smaller alignment fixes while in there, so Gap filler sees the same
   diary as Schedule:
   - ignore deleted lessons (Schedule already does; Gap filler currently lets a
     deleted lesson block a slot),
   - treat pupils as active unless they are marked inactive, archived,
     cancelled or deleted, instead of requiring the exact word "active" — the
     stricter check can silently produce an empty pupil list.

## Technical notes

- Only `src/routes/gaps.tsx` changes. No change to `src/lib/gapDetection.ts`,
  its tests, the offer sheet, pupil matching or SMS queueing.
- Instructor load: `maybeSingle()` + reduced-column retry on error + defaults;
  drop the `throw`. Keep the existing `user_id` fallback lookup.
- Lessons query gains `.is("deleted_at", null)`; pupils query swaps
  `.eq("status","active")` for `.not("status","in","(inactive,archived,cancelled,deleted)")`
  plus `.is("deleted_at", null)`.
- Error banner: `loadError` always set to a non-empty string.
- Verify with `bunx tsgo --noEmit` and `bun test src/lib/gapDetection.test.ts`.
- `capacitor.config.ts` is not touched.
