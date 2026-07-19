## Problem

On the pupil record, the Next Lesson card's date reads "Invalid Date". Root cause is in `src/routes/pupils.$id.tsx` line 1959:

```ts
const start = new Date(`${focus.lesson_date}T${focus.lesson_time || "00:00"}:00`);
```

Postgres `time` columns come back as `"HH:MM:SS"`. When `lesson_time` is `"19:00:00"`, the template appends an extra `:00`, producing `"2026-…T19:00:00:00"`, which is not a valid ISO string, so `start` is `Invalid Date`. The time text still shows correctly because `formatTime()` slices to 5 chars.

## Fix

Normalise the time to `HH:MM` before concatenation, so both `"19:00"` and `"19:00:00"` values work:

```ts
const timePart = (focus.lesson_time || "00:00").slice(0, 5);
const start = new Date(`${focus.lesson_date}T${timePart}:00`);
```

Also apply the same normalisation to the other two `new Date(...)` constructions in this file that use `lesson_date + lesson_time` (around lines 2216 and 2330, feeding the past/upcoming lesson lists) so those rows can't hit the same bug.

## Scope

- Only touch `src/routes/pupils.$id.tsx`.
- No schema, styling, or behaviour changes beyond fixing the date parse.
