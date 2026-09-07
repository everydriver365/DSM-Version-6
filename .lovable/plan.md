# Fix: Gap filler shows "We couldn't load your diary"

## What's happening

The Gap filler page loads everything it needs in one go and treats *any* single
failure as fatal: the instructor record, lessons, imported calendar events,
recurring blocks, time off, pupils, pupil availability and pupil unavailability
are all fetched together, and the first one that errors throws away the whole
page and shows the "We couldn't load your diary" screen with a Try again button
(confirmed in `src/routes/gaps.tsx`, lines 194-247).

Two consequences:

- One missing or restricted piece of data (for example a pupil-availability
  table the account can't read, or an instructor record stored under a
  different id field) blanks the entire page, even though gaps could still be
  calculated from lessons and working hours alone.
- The real reason is never shown — only the generic sentence — so it can't be
  told apart from a network blip.

I could not reproduce it signed in from here (no test session is available in
this environment), so the exact failing request still needs to be identified.
The plan makes the page report it and survive it.

## The fix

1. Load the essentials first: the instructor's working hours and the lessons.
   If the instructor record isn't found under the signed-in id, retry the
   lookup the alternative way the rest of the app already supports before
   giving up.
2. Treat everything else as optional. Imported calendar events, recurring
   blocks, time off, pupils, availability and unavailability each fail
   independently: if one can't be read, log it and carry on with the rest, so
   gaps still appear. If pupil matching data is missing, gaps show with a small
   note that pupil suggestions are unavailable.
3. When something genuinely does fail, show the actual reason under the "We
   couldn't load your diary" line (plus the existing Try again button), instead
   of a bare generic message.
4. Add a short diagnostic line in the browser log naming which parts loaded and
   which didn't, so the next report pinpoints the cause immediately.

## Technical notes

- Change is confined to `src/routes/gaps.tsx` (the `load()` function and the
  error block around line 560-580). No change to `src/lib/gapDetection.ts`,
  its tests, or the gap maths.
- Replace the "throw on first error" check with per-result handling: required =
  instructor + lessons; optional = calendar_blocks, instructor_recurring_blocks,
  instructor_time_off, pupils, pupil_availability, pupil_unavailability.
- Keep the existing UI, offer sheet, SMS queueing and matching untouched.
- Verify with `bunx tsgo --noEmit` and the existing `bun test`.
- `capacitor.config.ts` is not touched.
