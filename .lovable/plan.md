
# gaps.tsx — Availability Data Source Audit (read-only)

Scope: `src/routes/gaps.tsx` only. Two fetches: the slot-detection effect (lines ~356–500) and the pupil-ranking `run()` (lines ~670–740).

## 1. Instructor availability (`instructors` row, line 377–384)

Selected columns: `working_hours_start, working_hours_end, working_days, lesson_buffer_minutes, lesson_buffer_before, lesson_buffer_after, hourly_rate`.

| Field | Fetched | Applied |
|---|---|---|
| working_hours_start / _end | ✅ | ✅ used as `wsMin`/`weMin` bounds for free-slot detection (default 09:00–18:00) |
| working_days | ✅ | ✅ `isWorkDay = workDays.includes(dayName)`; defaults to Mon–Fri |
| lesson_buffer_before / _after | ✅ | ✅ used as fallback when a pupil has no custom buffer (line 433–434, 466–471) |
| lesson_buffer_minutes | ✅ | ⚠️ read into `buffer` but never referenced again (dead value) |
| lunch_break_start / _end | ❌ | ❌ not selected, not applied (column may or may not exist — untested) |
| hourly_rate | ✅ | ✅ used for the "potential earnings" display (line 1741, 1797); NOT used to weight ranking |

## 2. Pupil availability (`pupil_ready_to_learn_settings`, line 682–685)

Table fetched: ✅ `select("*")` scoped by `instructor_id`.
Consumed columns (see `Availability` interface + `scoreSlot`):

| Column | Used | Score effect |
|---|---|---|
| available_days | ✅ | +15 if slot's weekday matches, -30 if not |
| available_from / available_until | ✅ | +10 if slot hour inside window, -20 if outside (hour-only, ignores minutes) |
| min_notice_hours | ✅ | Used to flag `shortNotice`; default 24 |
| short_notice_opt_in | ✅ | +5 if inside notice window and opted in; -40 if inside window and NOT opted in |
| preferred_duration_minutes | ✅ | +10 if matches slot duration |
| max_lessons_per_week | ⚠️ | Fetched via `select("*")` but never referenced |
| pupil_id | ✅ | key for `availMap` |

Base score 50, clamped 0–100. Recency: `last_lesson_date` (from pupils or most-recent lesson) contributes ±20/±10/-20 based on days since. Final score = `matchCount/total * 60 + avgSubScore * 0.4`.

## 3. Lessons (existing bookings)

Two separate lesson fetches:

- **Slot-detection (line 367–376):** window `today → today+14`, statuses `["confirmed","pending"]`, `deleted_at IS NULL`. ✅ cancelled excluded (not in `in()` list). ✅ deleted excluded.
- **Pupil ranking (line 686–692):** no date range — all history, statuses `["completed","confirmed"]`, `deleted_at IS NULL`. Used only to derive most-recent `last_lesson_date` per pupil.

`in_progress` status: ❌ not included in either query.

## 4. Calendar blocks

Fetched via REST (line 386–406) with filter `source=eq.external_calendar`, window `start_datetime >= startIso AND <= endIso+T23:59:59`.
- Applied: ✅ merged into `dayLessons` as pseudo-lessons with zero buffers (line 490–498), so they consume gap time.
- All-day events: ⚠️ handled only partially. `getCalendarBlocksForDate` (line 108–119) uses `substring(11,16)` on the ISO string. All-day ICS events stored as `YYYY-MM-DDT00:00:00 → YYYY-MM-DDT00:00:00` (or next-day midnight) would produce `start=0, end=0` (zero-length, invisible) or a bad range. Multi-day blocks: only counted on their start date (filter is `startDate === iso`), so day 2+ of a multi-day block is ignored.
- Non-`external_calendar` sources (e.g. manual blocks): ❌ not fetched.

## 5. Travel time between lessons

❌ Not calculated. Only `lesson_buffer_before/after` (per-pupil or instructor default) is inserted. No use of `pupils.postcode`, no distance/drive-time lookup. Would need a routing API (Google/Mapbox Distance Matrix) plus a lesson `location`/postcode per booking to compute.

## 6. Pupil custom buffers (`pupils.buffer_before_minutes / _after_minutes`)

✅ Fetched in the joined `pupils(...)` select on the lessons query (line 369). ✅ Applied per-lesson (line 466–471), falling back to instructor defaults.
⚠️ Note: buffers are stored on each merged busy entry but the gap-detection code between here and line 500 needs the surrounding logic to actually subtract them — visible portion looks correct up to line 500, would need lines 500+ to confirm the buffer is deducted from the free window.

## 7. Missing data sources

| Source | Status |
|---|---|
| Recurring blocks (weekly school run etc.) | 🚧 no schema; only one-off `calendar_blocks` rows are supported |
| Vehicle service / MOT days | 🚧 no column/table |
| Holiday / time-off periods | 🚧 no table; would need `instructor_time_off` |
| Peak-hour preferences | 🚧 no column beyond flat working_hours |
| Pupil last-lesson gap ("don't offer too soon") | ⚠️ data exists (`last_lesson_date` + lessons history), applied only as a score nudge (-20 if <3d); no hard cutoff |
| Pupil max_lessons_per_week | ⚠️ column fetched (`select *`) but never enforced or scored |
| Lunch break | ❌ not fetched from instructor row |
| Travel time | 🚧 no data infrastructure (needs per-lesson location + routing API) |
| `calendar_blocks` with source ≠ external_calendar | ❌ filtered out |
| in_progress lessons | ❌ excluded from busy set (minor: they occupy time now) |

## 8. Accuracy summary

✅ Correctly fetched and applied
- working_hours_start/end, working_days
- lesson_buffer_before / lesson_buffer_after (instructor defaults)
- pupils.buffer_before_minutes / _after_minutes
- available_days, available_from/until, min_notice_hours, short_notice_opt_in, preferred_duration_minutes
- hourly_rate (for earnings readout only)
- deleted_at exclusion, cancelled exclusion

⚠️ Fetched but not fully applied
- `lesson_buffer_minutes` (dead read)
- `max_lessons_per_week` (unused)
- calendar_blocks all-day / multi-day handling
- last-lesson recency (score-only, no hard rule)
- hourly_rate (not used in ranking, only display)

❌ Not fetched at all
- `lunch_break_start` / `lunch_break_end`
- `calendar_blocks` from non-external sources
- `in_progress` lesson status
- travel/location data

🚧 No data source exists
- Recurring blocks, vehicle service, holidays/time-off, peak-hour preferences, drive-time between lessons

No code changes made. Approve to switch to build mode if you want any of the ⚠️/❌ items wired up.
