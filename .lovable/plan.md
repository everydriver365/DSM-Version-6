# Why push notifications and app icon counters don't work

## What I checked

- `src/routes/__root.tsx` (OneSignal init, permission, player-ID save, badge clearing)
- `src/hooks/useUnreadCount.ts` (badge setting)
- `supabase/functions/send-push/index.ts` (the OneSignal REST call)
- `ios/App/App/App.entitlements`, `Info.plist`, and the Xcode project file

## Findings

### 1. The device is probably never registered (no notifications arrive)

Right after `OneSignal.initialize(...)` the code immediately reads the push subscription ID and writes it to `instructors.onesignal_player_id`. At that moment iOS has usually not returned an APNs token yet, so the ID is `null`, nothing is saved, and `send-push` later exits early with `"No OneSignal player ID"` — no notification is ever sent. There is no listener to catch the ID once it does arrive, and it is only attempted once per app launch.

The permission call is also duplicated (`requestPermission()` plus `Notifications.requestPermission(true)`), which is harmless but makes the flow harder to reason about.

Unconfirmed until we see the device: whether the OneSignal dashboard has the APNs key uploaded and whether the bundle ID matches. The entitlement is `aps-environment: development`, which is correct for an Xcode-installed build but will not work for TestFlight/App Store builds unless it is switched to `production` for release.

### 2. Nothing ever sets an app icon counter

- `useUnreadCount.ts` and `__root.tsx` call `App.setBadge()` / `App.clearBadge()` on `@capacitor/app`. Those methods do not exist in that plugin — the optional-call syntax silently swallows it, so the badge is never set.
- The push payload in `send-push` contains no `ios_badgeType` / `ios_badgeCount`, so pushes arriving while the app is closed can't set a badge either.
- There is no OneSignal Notification Service Extension target in the Xcode project, which is also needed for reliable badge/rich-notification behaviour.

## Proposed fixes

1. **Registration**: replace the one-shot ID read with an observer on the OneSignal push subscription so the player ID is saved whenever it becomes available (and re-saved on login and on app resume). Remove the duplicate permission request and log the actual permission + subscription state so we can see it in Xcode console.
2. **In-app / icon badge**: add a real badge plugin (`@capawesome/capacitor-badge`) and use it in `useUnreadCount.ts` and on app resume instead of the non-existent `App.setBadge`.
3. **Push-driven badge**: add `ios_badgeType: "SetTo"` and `ios_badgeCount` (the recipient's current unread count) to the `send-push` OneSignal payload so the counter updates when the app is closed.
4. **Diagnostics screen (small)**: a hidden section in More showing permission state, subscription ID, and whether it matches the DB row, so we can confirm on the real phone rather than guessing.

## Things you need to do outside the code

- Confirm in the OneSignal dashboard that the iOS APNs key is uploaded and the bundle ID matches the Xcode target.
- Add the OneSignal Notification Service Extension target in Xcode (I can't edit the Xcode project safely from here) and add `@capawesome/capacitor-badge` pods via `npx cap sync`.
- Switch `aps-environment` to `production` before shipping to TestFlight.

## Technical notes

- Files to change: `src/routes/__root.tsx`, `src/hooks/useUnreadCount.ts`, `supabase/functions/send-push/index.ts`, plus one new package.
- `capacitor.config.ts` will not be touched.
