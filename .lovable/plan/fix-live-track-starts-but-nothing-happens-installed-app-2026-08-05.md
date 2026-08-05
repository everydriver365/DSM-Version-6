# Fix: Live track starts but nothing happens (installed app)

## What I checked

In `src/routes/live.tsx`:

- Selecting a pupil (line ~1978) sets `activePupilId` and calls `startTracking`.
- `startTracking` (line 618) first calls `(window as any).despia("backgroundlocationon://")` with no guard, then `setTracking(true)` and `startWatching()`.
- The idle "Select pupil / Start" card is gated on `!tracking && !activeLessonId && !activePupilId` (line 1498), so it disappears as soon as a pupil is picked — even if tracking never actually begins.
- The tracking panel only fills in once GPS positions arrive; until the first fix there is no "waiting" state.

So in the Despia wrapper there are two ways the screen ends up looking dead: the unguarded native bridge call throwing before `setTracking(true)`, or the native location permission never being granted so `watchPosition` never fires while the start card has already been hidden. I have not been able to reproduce inside the wrapper from here, so the plan makes both paths visible rather than asserting one.

## Plan

Only `src/routes/live.tsx` changes.

1. **Guard the native bridge calls.** Wrap every `(window as any).despia(...)` call in try/catch so a missing or throwing bridge can never abort `startTracking` before tracking begins. Also check `typeof (window as any).despia === "function"` instead of relying on the user-agent string alone.
2. **Prompt for GPS permission explicitly.** Before starting the watch, do a one-shot `getCurrentPosition` so the wrapper shows the native location prompt and we get an immediate first fix. If it fails, set `geoError` with the real reason (denied / unavailable / timeout) and show a toast.
3. **Never hide the start card on a failed start.** Keep the idle overlay logic tied to whether tracking actually started: if `startTracking` bails out, clear `activePupilId`/`trackingPupilName` so the "Select pupil" card comes back instead of an empty map.
4. **Add a visible "Waiting for GPS…" state.** While `tracking` is true but no coordinate has arrived yet, show a pulsing "Acquiring GPS signal…" line in the bottom panel with a Cancel button, so the user always sees that something is happening.
5. **Make the permission error actionable.** The existing `geoError` banner gets a tap action that opens app settings via the bridge (guarded), plus a "Try again" button that re-runs the start.

## Verify

In the installed app: tapping a pupil should immediately show "Acquiring GPS signal…" with the pupil's name, then switch to live speed/distance once a fix arrives. If location permission is off, an error banner explains it and offers to open settings, instead of the screen appearing to do nothing.
