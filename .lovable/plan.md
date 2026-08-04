# Fix: tapping a pupil in Live track does nothing

## What I checked

In `src/routes/live.tsx`, tapping a pupil in the "Select pupil" sheet closes the sheet and calls `startTracking(null, pupilId)`. That function:

1. Awaits an insert into `lesson_routes` (creates the route record).
2. Only after that await completes does it call `setTracking(true)` and start the GPS watch.

So if that insert is slow, blocked, or the request never settles, the screen stays exactly as it was — no tracking UI, no error, nothing visible. That matches the symptom, but I could not confirm the insert is the cause: reproducing it here needs a signed-in session, and the sandbox browser has none (the picker showed "No pupils found").

I am not asserting the root cause yet — step 1 makes the failure visible, the rest hardens the flow so a backend hiccup can never silently swallow the tap.

## Plan

Only `src/routes/live.tsx` is touched.

1. **Make the tap observable.** Log the pupil tap, and log the `lesson_routes` insert result (success id or error) instead of a quiet `console.warn`. Show an error toast if the insert fails so the user sees why.
2. **Don't let the route insert block tracking.** Start GPS tracking and flip the UI into tracking state first, then create the `lesson_routes` row in the background and attach its id when it returns. A failed or slow insert then degrades to "route not saved" rather than "button does nothing".
3. **Immediate visual feedback on tap.** Set the tracking state before closing the sheet, so there's never a frame where the tap appears to have done nothing.
4. **Guard the no-op paths.** `startTracking` currently returns silently when `tracking` is already true or geolocation is unavailable. Add a toast in the geolocation-missing case so that path is also visible rather than silent.

## Verify

After the change, tapping a pupil should switch immediately to the tracking screen with the pupil's name shown. If the route record can't be created, tracking still runs and a toast explains the save failure — and the console log will tell us whether the `lesson_routes` insert was the original culprit, so we can follow up with an RLS/schema fix if needed.
