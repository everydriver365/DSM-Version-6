# Gap Filler rebuild

## What I checked first

I read the gap engine (`src/lib/gapDetection.ts`), the matching engine
(`src/lib/pupilMatching.ts`), the Gap filler page, the Home gap card, the
Schedule gap block and the `send-sms` function, and I queried the live
database to confirm every table and field before writing this.

Confirmed to exist exactly as expected: `gap_filler_offers`
(instructor_id, pupil_id, slot_date, slot_time, duration_minutes, status,
sent_via), `pupil_ready_to_learn_settings`, `pupil_unavailability`
(pupil_id, start_date, end_date — no instructor column), `instructor_recurring_blocks`,
`instructor_time_off`, `calendar_blocks` (incl. source, is_all_day,
blocks_availability), `lessons`, `pupils`, `sms_queue`, and the instructor
fields name, working_hours_start/end, working_days, per_day_hours,
lesson_buffer_after, hourly_rate.

Confirmed NOT to exist: `instructors.user_id`.

## Why it is failing today

1. **Your working hours are quietly ignored when the settings read fails.**
   The page asks for the instructor record twice; the second attempt looks up a
   column (`user_id`) that does not exist, so it always errors. When the first
   read has any problem the page silently falls back to 09:00–18:00,
   Mon–Fri, no buffer — so the gaps shown are not your diary at all.
2. **The minimum gap comes from a per-device setting**, not the agreed 60
   minutes, so the same account can show different gaps on different devices.
3. **Pupil labels are fake.** The page only lists pupils the engine already
   matched, then splits that list into "high / good / possible" purely by
   position in the array. A pupil with no availability record is dropped
   entirely, and nothing on screen reflects a real match result.
4. **The offer flow only handles one pupil.** There is no multi-select, no
   duplicate check, and the offer insert and the queue insert are never checked
   for errors, so "Offer sent" appears even when nothing was saved.
5. **The SMS result is never read.** `send-sms` drains the whole queued list
   and returns `{sent, failed}`; the page ignores the response, so failures are
   reported as successes.
6. **Home's gap card uses its own private matching copy** that ignores the
   time window and pupil holidays, and hard-codes £40 an hour.

The gap engine itself is sound: it clamps to working hours, merges overlaps,
applies lesson buffers, honours all-day and non-blocking calendar events and
the "not within 30 minutes" rule for today. It stays untouched.

## The fix

### Gap filler page (`src/routes/gaps.tsx`) — rewritten cleanly

- Signed-out users go to login.
- Load the instructor record once, by id, with the real fields. If it cannot
  be read, show the error state — never invent working hours.
- Load, with error checks on every request: lessons (7 days, not deleted),
  `calendar_blocks` where source is `ics_inbound` and the event overlaps the
  window, recurring blocks, time off, active pupils, availability from
  `pupil_ready_to_learn_settings`, and pupil holidays from
  `pupil_unavailability` filtered by pupil ids only.
- Exactly 7 days: today through today + 6. Skip non-working days, apply
  per-day hour overrides, skip full-day time off, then hand the day's busy
  periods to `computeDayGaps` with a fixed 60-minute minimum. Every gap it
  returns reaches the screen.
- Four honest states: loading, "Couldn't load your gaps / Please try again"
  with a retry button, "No gaps in the next 7 days", or the gap interface.
- Layout: navy header with back arrow, green banner "X gaps found / Based on
  your working hours", horizontal date-and-time pills, a white card with day,
  date, times, duration and potential value from your real hourly rate (the
  value is omitted entirely when no rate is set).
- Pupil list shows **every** active pupil with initials avatar, name, phone or
  "No phone", a checkbox, and a badge that comes straight from the matching
  engine: green "Available" when matched, grey "No preference" when the pupil
  has no availability saved, muted "Unavailable" when saved availability does
  not fit. "Select all available" ticks only genuine matches, and the
  available count counts only genuine matches.
- "Send to X pupils" opens the offer sheet with an editable message,
  personalised per pupil, defaulting to the agreed wording.

### Sending offers

For every selected pupil, in turn:

1. Skip if a pending offer already exists for that pupil, date and time.
2. Insert the offer into `gap_filler_offers` and check the result.
3. If the pupil has a phone, add the personalised message to `sms_queue`, then
   call `send-sms` and read its reply. That function deliberately takes no
   body — it drains queued messages and reports how many sent and failed — so
   the queue row is what actually carries the message.
4. No phone means no SMS and no claim of one.

The result message reports honestly, e.g. "Offer sent to 3 pupils · 1 skipped
(already offered) · 1 no phone · 1 failed".

### Home gap card (`src/routes/home.tsx`)

Only the gap row changes: compact gold-tinted row, dashed gold bar, time on
the left, "Free · Xhr Ymin" plus a genuine "X pupils available" count from the
shared matching engine (including pupil holidays and the time window), and a
gold "Fill →" button that opens the Gap filler without double-navigating.
The hard-coded £40 goes.

### Schedule gap block (`src/routes/schedule.tsx`)

Only the dashed gap block changes: time range, "Free · Xhr Ymin", up to three
pupil initials and an accurate "X available", tapping opens the Gap filler.

## Limitations

- I cannot sign in as you from here, so I can verify the code and the data
  contracts but not the exact gaps your own diary will produce; I will report
  what the engine does with your settings once it is live.
- Google-connected calendar events stay visible but are still excluded from
  gap detection, as previously agreed — only imported ICS events block time.
- `send-sms` sends whatever is queued account-wide when triggered; that is the
  existing design and I am not changing it.
