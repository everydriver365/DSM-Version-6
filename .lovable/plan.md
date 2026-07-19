Add a circular pupil avatar to the left of each lesson tile on /schedule, using the same initials + calendar_colour pattern already used in the next-lesson card on /home.

## What will change

1. **src/routes/schedule.tsx**
   - Add a small `PupilAvatar` helper inside the file (or inline) that renders:
     - A circular `div` (e.g. 32 × 32 px, borderRadius 50%).
     - Background colour from `pupilColour(lesson.pupil_id, lesson.pupil?.calendar_colour, pupilName)`.
     - White initials derived from `first_name`/`last_name`/`name`, or a single-letter fallback.
   - Insert the avatar as the first element in the non-block lesson row (the `!isBlockRow` branch starting at line 1508), so the layout becomes: `[avatar] [name + time] [move button] [DSM tag]`.
   - Adjust the row flex gap/padding to keep the existing 12 px card padding and avoid text feeling cramped.
   - For cancelled lessons, keep the avatar opacity consistent with the rest of the row (it already inherits the parent opacity).

## What will NOT change

- No data fetching changes — the schedule query already selects `pupil.pupils!inner(id, name, first_name, last_name, calendar_colour, …)` which is enough for an initials avatar.
- No changes to block rows, gap rows, calendar rows, or move-mode behaviour.
- No new files or dependencies.

## Result

Each lesson tile in the schedule agenda will show the pupil's initials in their assigned colour circle next to the name, matching the avatar style used elsewhere in the app.