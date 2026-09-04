# Bring the ETA back on the Test Day card

## What's happening

The next-lesson card only shows the ETA when it has a drive time for the trip. On a normal lesson the destination is the pupil's pickup address. On a test day the same field holds the test centre instead, and the card builds its destination by gluing the test centre, the pupil's address and their postcode together into one line. That mixed line is very likely why the map service returns nothing, so the drive time — and with it the ETA — disappears.

This cause is likely but not yet proven, so the first step is to confirm it with a real test-day lesson before changing anything.

## Plan

1. Confirm the cause: log/inspect what destination the card sends for a test-day lesson and whether the drive-time lookup returns a result.
2. If confirmed, build the destination properly for test days: use the test centre on its own (the place the instructor actually drives to), rather than test centre + home address + postcode combined.
3. Keep everything else the same: the pickup row still shows the pupil's home address, the Test Day ribbon, test time and all other chips stay untouched.
4. Check on a test-day lesson that travel time and the ETA both appear again, green when on time and red with the message option when running late.

## Technical notes

- File: `src/routes/home.tsx` only.
- The chip effect (~line 3985) composes `destination` from `pickup_location`, `pupils.address`, `pupils.postcode`. For test lessons (`isTestLesson`) it should use the test centre value alone.
- ETA rendering (~line 5686 and ~6343) needs no change; it depends on `driveData` being non-null and the lesson starting within 12 hours.
