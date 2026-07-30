# Stop DSM lessons appearing twice in the schedule

## What's happening

DSM now pushes each new lesson out to Google Calendar. Separately, DSM
imports your Google Calendar back in (the ICS/external-calendar sync),
which stores every Google event as a "calendar block". The lessons DSM
itself created come back in that import, so the schedule shows the DSM
lesson and a Google copy of the same lesson side by side.

Confirmed in the code: `home.tsx` and `schedule.tsx` both read
`calendar_blocks` where `source = external_calendar` and render those
rows alongside lessons, with no check for whether the block is really a
DSM lesson that was echoed back.

The two sync edge functions themselves live outside this repo, so the
de-duplication is done where the data is read and rendered.

## The fix

Add one shared helper and use it in both places that render calendar
blocks, so an imported Google event is hidden when it is really a DSM
lesson coming back:

1. **Match on the Google event id first.** Lessons store
   `google_event_id` when DSM pushes them. If an imported block carries
   the same Google event id (or that id appears in its uid/description),
   hide the block.
2. **Fall back to time matching.** If no id is available on the imported
   row, hide any block whose start time matches a lesson's start time
   for the same instructor (within a small tolerance) and whose end time
   matches the lesson duration. This covers lessons pushed before the id
   was recorded.
3. Lessons always win — the DSM lesson row stays, the imported copy is
   dropped, so all lesson actions (cancel, move, payment pills) keep
   working.

Gap detection is fed from the same block list, so filtering at the
source also stops phantom "busy" time from blocking gap suggestions.

## First step: confirm the matching key

Before wiring the id-based match, inspect one imported
`calendar_blocks` row to see exactly which columns carry the Google
event identity (e.g. `external_uid`, `title`, `description`). If no
usable id column exists, the time-based match becomes the sole rule and
the id branch is dropped.

## Technical notes

- New file: `src/lib/calendarDedupe.ts` exporting
  `filterEchoedBlocks(blocks, lessons)`.
- Edits: `src/routes/home.tsx` and `src/routes/schedule.tsx` — apply the
  filter immediately after `calendar_blocks` is fetched, before it is
  passed to timeline rendering and gap detection.
- No database migration, no edge function changes.
