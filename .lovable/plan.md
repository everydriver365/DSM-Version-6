# Why the notification prompt doesn't appear — and what to change

## What I verified in the code

- `src/routes/__root.tsx` initialises OneSignal and, on native only, calls
  `OneSignal.Notifications.requestPermission(true)` immediately after init, then logs
  whether permission is granted. That code is present and correct.
- The whole native block is inside `if (!Capacitor.isNativePlatform()) return;`, so in the
  browser preview (where you're looking now) no iOS prompt can ever appear.
- The iOS project does include the OneSignal plugin and the Badge plugin
  (`ios/App/CapApp-SPM/Package.swift`), plus `remote-notification` background mode in
  `Info.plist`, so the native pieces exist in the repo.

## Most likely reasons on the phone

1. iOS shows the system permission alert **once per install**. If a previous build already
   asked (and you tapped Don't Allow, or allowed and later toggled it off), iOS will never
   show it again — `requestPermission()` returns silently. It can only be changed in
   iOS Settings > Every Driver Pro > Notifications, or by deleting and reinstalling the app.
2. The build on the phone must be a fresh archive containing the current native plugins;
   a web-only update cannot add them.
3. If `OneSignal.initialize` throws (bad build/plugin not linked) the error is only written
   to the console — nothing is shown in the app, so it looks like "it never asked".

## Proposed changes

1. **Make permission state visible and actionable** in `src/routes/notificationsettings.tsx`:
   - On mount, read `OneSignal.Notifications.permission` / `hasPermission()` and show a
     clear status row: Enabled / Not enabled / Blocked in iOS Settings.
   - When the request returns still-not-granted, show a toast plus an "Open iOS Settings"
     button that deep-links to the app's settings page, since iOS won't re-prompt.
2. **Surface init failures** in `src/routes/__root.tsx`: if OneSignal init or the permission
   request throws on native, store a flag so the notification settings screen can display
   "Push service unavailable in this build" instead of failing silently. No change to the
   init order or the OneSignal App ID.
3. No changes to `capacitor.config.ts`, `send-push`, `useUnreadCount`, or the iOS project.

## How to confirm on the device

- iOS Settings > Every Driver Pro > Notifications: if Allow Notifications is off, that is the
  answer — turn it on there.
- If the app is missing from that list entirely, the installed build predates the OneSignal
  native plugin and needs a fresh archive/install.
