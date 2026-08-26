# iOS notification badge: minimum safe fix

## Confirmed findings

- The current source already includes the correct native badge plugin (`@capawesome/capacitor-badge`) and calls `Badge.set()` with the database unread count.
- The shared OneSignal sender already supplies `ios_badgeType: "SetTo"` and `ios_badgeCount`; all identified push callers use that sender.
- The iOS target includes the badge and OneSignal packages, links the production APNs entitlement, and enables remote-notification background mode.
- Those native badge changes were added in commit `e4c09630`; a phone running an older Xcode/TestFlight archive cannot receive the native plugin or entitlement through a web update and must install a newly archived build.
- OneSignal `permissionNative()` returns numeric values (`0–4`), but `__root.tsx` and `notificationsettings.tsx` compare the result with strings such as `"authorized"`. This makes the app report granted permission incorrectly even though the permission request itself can succeed.
- A Notification Service Extension is not required for a plain app-icon badge, so adding one would be unnecessary scope.

## Implementation

1. Replace the incorrect string comparisons with OneSignal's boolean `Notifications.hasPermission()` result in the initialization and notification-settings flows.
2. Preserve the current badge source of truth: unread `instructor_notifications` count drives `Badge.set()`; do not add competing increment/clear logic.
3. Preserve the existing OneSignal sender badge payload and APNs/native configuration; no speculative extension or new push framework.
4. Verify the affected TypeScript and confirm there are no remaining string comparisons against `permissionNative()`.

## Release verification

- Archive and upload a fresh iOS build from the current native project, then install that new build on the phone.
- Confirm Push Notifications is enabled for the `co.uk.everydriver.app` App ID/provisioning profile in Xcode/Apple Developer.
- Device test: close the app, send a notification that creates an unread row, confirm the icon badge appears, reopen the app, and confirm it reconciles to the database unread count.

## Files

- `src/routes/__root.tsx`
- `src/routes/notificationsettings.tsx`

No change to `capacitor.config.ts`.
