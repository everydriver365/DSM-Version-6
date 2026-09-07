# Fix: gaps don't allow travel time before the next lesson

## What's wrong

A gap of 12:00–13:00 on the 9th is being offered as a full hour, even though a
lesson starts at 13:00. Travel time is currently only added *after* a lesson,
never *before* the next one, so the last minutes of every gap are unusable in
real life.

Confirmed in `src/lib/gapDetection.ts`: each lesson becomes a busy block of
`start → end + buffer_after`. Nothing reserves time at the leading edge of the
following lesson, so the free window runs right up to its start time.

Your settings only have a single "buffer after lesson" value (instructor-level
`lesson_buffer_after`, optionally overridden per pupil), so that same value is
what should be reserved for getting to the next appointment.

## The fix

In the shared gap calculation:

- When a free window ends because a lesson, personal calendar event, recurring
  block or time off starts, shorten the window by the travel buffer that applies
  to that next commitment (per-pupil buffer if the next item is a lesson with
  one, otherwise the instructor default).
- Re-apply the minimum gap rule afterwards, so a 12:00–13:00 window with a
  15-minute buffer becomes 12:00–12:45 and, being under the 60-minute minimum,
  simply isn't offered any more.
- Windows that run to the end of the working day keep their full length (no
  travel to a next booking is needed).

Because Home, Schedule and the Gap Filler page all call the same function, all
three screens become consistent in one change.

## Technical notes

- Edit `src/lib/gapDetection.ts` only; keep the exported signature. Track a
  `bufferBefore` value alongside each busy interval, carry the maximum through
  the overlap-merge step, and subtract it from `endMins` when a gap abuts that
  interval.
- `src/routes/gaps.tsx` already passes per-pupil `bufferAfterMinutes` and
  `instructorBufferAfter`; no data changes needed there.
- Extend `src/lib/gapDetection.test.ts` with cases for: gap shortened before a
  buffered lesson, gap dropped when the shortened length falls under the
  minimum, and end-of-day gap left untouched. Run `bun test` and `bunx tsgo
  --noEmit`.
- No backend, schema or `capacitor.config.ts` changes.
