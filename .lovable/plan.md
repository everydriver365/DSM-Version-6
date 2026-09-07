# Availability, Buffer & Gap Filler — Forensic Audit

No code, database or settings were changed. This is findings plus a suggested fix order for you to approve.

## 1. How availability is worked out today

```text
Instructor hours (instructors.working_hours_start/end, working_days, per_day_hours)
  + Lessons (lessons, minus deleted/cancelled)
  + Imported calendar (calendar_blocks: ics_inbound + external_calendar)
  + Recurring blocks (instructor_recurring_blocks)
  + Time off (instructor_time_off)
  + Flat buffer (instructors.lesson_buffer_after, per-pupil pupils.buffer_after_minutes)
        -> src/lib/gapDetection.ts computeDayGaps()  = FREE WINDOWS
        -> src/lib/pupilMatching.ts previewMatchForGap() = pupil shortlist
        -> src/routes/gaps.tsx -> gap_filler_offers -> sms_queue -> send-sms
```

Screens using it: `src/routes/gaps.tsx`, `src/routes/schedule.tsx`, `src/routes/home.tsx`.

## 2. What is genuinely working

- One shared free-time calculator; Gap Filler and Schedule feed it the same real data.
- Lessons, imported calendar events (including Google), recurring blocks, full and partial time off all block time.
- Travel buffer is reserved both before and after lessons and imported events.
- Full-day imported events and full-day time off clear the day.
- Dates use local clock with a midday anchor, so BST/GMT day boundaries hold.
- Pupil holidays (`pupil_unavailability`) are respected; day, window, minimum duration and notice period are all enforced.
- Gap Filler counts SMS results only from the message rows it created itself.

## 3. Confirmed problems, ranked

1. **Travel time is a fixed number of minutes, never a real journey.** No postcode, distance or drive-time data reaches the calculator (`gapDetection.ts` has no location fields at all). Drive-time lookup exists (`src/lib/lesson-drive-time.*`) but is only used for the next-lesson ETA card on Home. So a gap between two pupils 30 minutes apart is offered as fully usable. Your scenario 21 (09:00 A, 11:00 B, 15 min there, 10 min on) is currently reported VALID; with real travel it is INVALID.
2. **No double-booking protection anywhere.** Creating a lesson (`lessons.new.tsx`, `courses.$id.tsx`, `messages.$pupilId.tsx`) does no overlap check, and the database has no unique or exclusion constraint on `lessons`. Two people accepting the same gap at the same moment both succeed. Gap Filler also never checks whether the matched pupil already has a lesson at that time.
3. **Home disagrees with Gap Filler and Schedule.** Home's free-slot and free-minutes calculations pass empty recurring blocks and empty time off, so Home can advertise a slot that is actually blocked. Gap Filler also ignores your saved minimum-gap preference and hard-codes 60 minutes, while Home and Schedule honour the setting.
4. **Availability is one window per day, per person.** Instructors get a single start/end per day (no split shifts), and the lunch break in Availability Settings is not saved at all — it is on-screen only. Pupils likewise have one from/until across all their chosen days, so "Monday 09:00–10:00 and 14:00–16:00" cannot be expressed. Pupil holidays are whole days only.
5. **"No preference" is inferred, not chosen, and candidates are not ranked.** A pupil shows as "No preference" purely because they have no availability record. Ranking is alphabetical within status; postcode is loaded but unused, so nearest pupil is never favoured.

Also found, smaller: `schedule.tsx` derives "today" from a UTC date string in one place, which can be a day out near midnight in summer; recurring blocks and time off reserve travel time before but not after them, unlike lessons; a duplicate offer is only blocked for the exact same date and time.

## 4. Answers to your verdict questions

- Availability engine reliable: **PARTIALLY** — solid on diary conflicts, blind to geography and to concurrent bookings.
- Gap Filler producing genuinely usable gaps: **PARTIALLY** — time-correct, travel-naive.
- Pupil availability correctly intersected with instructor availability: **YES** for the single-window model it supports.
- Travel and buffers correct: **PARTIALLY** — fixed minutes applied consistently, never distance-based.
- Google Calendar affecting availability: **YES** — `calendar_blocks` rows with source `external_calendar` are treated as busy with buffer either side, unless marked as not blocking availability.

## 5. Schema warning

`pupil_ready_to_learn_settings`, `pupil_unavailability`, `gap_filler_offers`, `instructor_recurring_blocks`, `instructor_time_off` and the instructor working-hours/buffer columns have **no migration in the repo** — they were created directly in Supabase. `db/002_create_lessons.sql` also no longer matches the live lessons table. The repo cannot rebuild this database.

## 6. Suggested fix order (nothing done yet)

1. Double-booking safety: a database-level guard plus a final availability re-check at the moment a lesson is created, and a pupil-conflict check inside Gap Filler.
2. Make Home use the same inputs as Gap Filler and Schedule, and make Gap Filler honour the saved minimum-gap setting.
3. Fix the UTC "today" line in Schedule, and make recurring blocks and time off reserve travel time on both sides.
4. Location-aware gaps: feed pickup postcodes and drive-time into the calculator, shrink gaps by real journey time, and rank candidates by distance.
5. Richer availability: saved lunch break, multiple windows per day for instructor and pupil, and part-day pupil exceptions.

## 7. Leave alone for now

Google Calendar sync and display, the SMS queue and `send-sms`, the shared matching function's rules, and `capacitor.config.ts`. Item 4 changes the meaning of a gap for everyone, so it should not start until items 1–3 are settled.
