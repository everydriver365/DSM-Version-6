# Fix the "Open Settings" alert that appears even though notifications are allowed

## What's happening

That dark "You currently have notifications turned off for this application" alert is not an iOS alert — it is OneSignal's own fallback dialog. It is shown because `src/routes/__root.tsx` (line 670) calls:

```ts
await OneSignal.Notifications.requestPermission(true);
```

The `true` argument means "fallback to settings": if OneSignal believes permission is not currently granted at that instant, it shows this dialog instead of the system prompt. It runs on every app launch, immediately after `OneSignal.initialize(...)`, before the SDK has read the device's actual permission state — so right after you approve notifications on a fresh install, the next launch (or the same launch, mid-init) can still see "not granted" and pop the dialog. Your iOS Settings screenshots confirm notifications and badges are in fact enabled.

## The fix

In `src/routes/__root.tsx`, in the native OneSignal block only:

1. Check permission first with `await OneSignal.Notifications.hasPermission()`.
2. If already granted, do nothing — no prompt, no dialog.
3. If not granted, call `requestPermission(false)` so only the real iOS system prompt can appear, never the OneSignal "Open Settings" dialog.
4. Only ask once per install: store a flag (e.g. `dsm.push.asked`) in `localStorage` and skip the automatic request if it is set, so a user who declined isn't nagged on every launch.
5. Keep the existing logging and the surrounding try/catch untouched.

The "Open Settings" path stays available where it belongs — the manual button in `src/routes/notificationsettings.tsx`, which the user taps deliberately when they want to re-enable notifications. That screen already shows Enabled / Not enabled / Blocked status.

## Files touched

- `src/routes/__root.tsx` (only the OneSignal permission lines)

No changes to `capacitor.config.ts`, the iOS project, `send-push`, or the badge logic.

## How to confirm

Delete and reinstall the app: you should see exactly one iOS system prompt, approve it, and then never see the dark "Open Settings" dialog again on subsequent launches.
