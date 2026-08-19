# Restore the Live Track pupil row

## Correction

You are right: the required bottom panel is the one in your screenshot — `TRACKING`, the selected pupil’s name, and the distance/duration chip. It must remain visible while tracking.

The JSX for that row is still present, but its pupil label currently relies only on the temporary `trackingPupilName` state. That can leave the row without the selected pupil identity if that transient state is lost or not yet available.

## Change

- Update only `src/routes/live.tsx`.
- Keep the existing bottom white tracking panel and its current layout.
- Restore the pupil-name display reliably by resolving the name from the selected pupil (`activePupilId`) as well as `trackingPupilName`, with the active lesson’s pupil name as an additional fallback.
- Keep the `TRACKING` label and the distance/duration chip exactly as shown.
- Ignore the floating native FAB.
- Do not change the header, map, route line, tracking controls, stats calculation, or tracking logic.

## Verification

- Start tracking after selecting a pupil and confirm the panel shows `TRACKING` plus that pupil’s name.
- Confirm the distance and duration chip remains on the right.
- Confirm the shared DSM bottom navigation remains hidden on `/live`.
