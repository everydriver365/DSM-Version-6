# iOS app icon badge audit — findings and minimum fix

## What I inspected
- `src/routes/__root.tsx` (OneSignal init, permission, click handler, app resume handler)
- `src/hooks/useUnreadCount.ts` (the only place that tries to write a badge number)
- `supabase/functions/send-push/index.ts` (repo copy)
- `ios/App/App/Info.plist`, `App.entitlements`, `AppDelegate.swift`, `SceneDelegate.swift`, `CapApp-SPM/Package.swift`, `Package.resolved`
- `package.json` native plugin list

## Confirmed findings

1. **No badge-capable native plugin is installed.** `package.json` has `@capacitor/app`, geolocation, haptics, keyboard, splash-screen, status-bar, contacts, keep-awake, OneSignal. There is no badge plugin, and `Package.swift` confirms the same set is linked into the iOS app.

2. **The app's badge code calls methods that do not exist.** `src/hooks/useUnreadCount.ts` lines 10-17 call `(App as any).setBadge?.({count})` and `(App as any).clearBadge?.()`. `@capacitor/app` has no badge API, so the optional-call operator silently makes both a no-op. The app therefore never sets a badge itself, and every screen that uses `useUnreadCount` (home, schedule, pupils, more, enquiries, courses) runs this dead code.

3. **`src/routes/__root.tsx` line 630 calls the same non-existent `App.clearBadge()` on every resume** — also a no-op, so it is not what wipes the badge, but it is dead code that must not be turned into a real "clear to 0" call.

4. **No Notification Service Extension and no App Group** exist in the Xcode project (no NSE target in `project.pbxproj`, no `com.apple.security.application-groups` in `App.entitlements`). `ios_badgeType: "SetTo"` does not require an NSE — iOS applies `aps.badge` directly — but OneSignal's badge *increment* features and confirmed-delivery do require it.

5. **The repo copy of `send-push` does not contain `ios_badgeType` / `ios_badgeCount`.** The deployed version does (your successful test), so the repo file is now out of date; any redeploy from the repo would silently regress badges.

## Most likely cause
The payload is correct, so iOS is receiving `aps.badge`. The badge is not being retained because **badge authorisation and badge state are never managed on the device side**: nothing in the app ever sets, verifies, or restores a badge value, and there is no way to confirm the badge permission bit was granted (the code only logs the overall permission status). This is a native/app-configuration gap, not an Edge Function problem.

Because I cannot read the device's actual notification settings from here, the plan below both fixes the definite code defects and adds the one diagnostic that will confirm the badge authorisation bit.

## Minimum changes

1. **`src/hooks/useUnreadCount.ts`** — replace the two dead `@capacitor/app` badge calls with a real badge plugin (`@capawesome/capacitor-badge`), guarded by `Capacitor.isNativePlatform()` and wrapped in try/catch. Keeps the existing unread query and realtime logic untouched.
2. **`src/routes/__root.tsx`** — replace the no-op `App.clearBadge()` on resume with a badge set to the *actual* current unread count (not 0), so opening the app never wrongly erases a real count. Also log `OneSignal.Notifications.permissionNative()` plus the badge plugin's permission state on launch, so TestFlight logs show whether badge authorisation was granted.
3. **`supabase/functions/send-push/index.ts`** — bring the repo copy in line with the already-working deployed version (`ios_badgeType: "SetTo"`, `ios_badgeCount`). No behavioural change to what is live; this only prevents a future redeploy from regressing it.
4. **`package.json` / iOS project** — add `@capawesome/capacitor-badge`. `npx cap sync ios` then regenerates `CapApp-SPM/Package.swift`.

Not changing: notification titles, routing, `data` payloads, `instructor_notifications` logic, permission-request flow, or `capacitor.config.ts`.

## Answers to your questions
- **Responsible files:** `src/hooks/useUnreadCount.ts` (primary), `src/routes/__root.tsx` (secondary), plus the missing native badge plugin in the iOS project.
- **Category:** JavaScript/TypeScript code calling a non-existent API, combined with a missing native plugin — not an Edge Function or OneSignal REST problem.
- **Rebuild needed:** Yes. Adding a native plugin requires `npx cap sync ios` and a new TestFlight build. (JS-only edits ship without a rebuild because `capacitor.config.ts` loads the web app from `app.everydriver.pro`, but the badge plugin itself is native.)
- **Edge Function changes:** None required for the live behaviour; only syncing the repo copy so it matches what is deployed.

## Verification after the rebuild
- Launch the TestFlight build, check Settings > Notifications > Every Driver Pro shows **Badges** enabled.
- Send the same direct test; confirm the number appears on the Home Screen icon.
- Background the app and resume it; confirm the badge falls to the real unread count rather than disappearing.
