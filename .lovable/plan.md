# Next lesson tile: hold on the in-progress lesson

## Current behaviour

The Next lesson card picks the first upcoming lesson whose **start time** is later than the
current time. So the moment a lesson starts, the tile jumps to the following lesson, even
though the instructor is still teaching the current one.

## Desired behaviour

The tile keeps showing the lesson that is currently running, and only advances once that
lesson's **end time** (start time + duration) has passed.

## Changes

Single file: `src/routes/home.tsx`.

1. In the "next lesson" selection, compare against the lesson's end time instead of its
   start time: a today lesson stays selected while `now < start + duration_minutes`
   (falling back to 60 minutes when duration is missing).
2. Apply the same end-time rule to the fallback selection used when the dedicated query
   returns nothing, so both paths agree.
3. Re-evaluate the choice on the existing minute tick already used on the home screen, so
   the tile rolls over on its own when a lesson finishes rather than only on a refetch.
4. Keep everything else as-is: card layout, actions (Late / On my way / EOL), the CarPlay
   payload, and the 1-hour reminder scheduling continue to use the same selected lesson.

## Note

Lessons marked `completed` are already excluded, so ending a lesson early still advances the
tile immediately.
