Badge counter update on new notification/activation

Goal: confirm whether the previous useUnreadCount fix already makes the app-icon badge update when a new notification arrives, and close any remaining gaps.

Current state (verified from source):
- `useUnreadCount` is invoked once at the root (`__root.tsx`) and nowhere else updates the badge.
- It fetches the unread `instructor_notifications` count and sets the badge via `Badge.set({ count })` or clears it.
- It subscribes to realtime `postgres_changes` on `instructor_notifications` to refresh when a row is inserted/updated.
- New notifications go through `notifyInstructors()` which inserts the DB row before invoking the `send-push` edge function.
- `send-push` reads the absolute unread count and sends `ios_badgeType: "SetTo"` with that count.

What the previous fix does:
- Fixes the in-app/foreground badge: with only one hook updating the badge and a working realtime channel, a new notification while the app is open will recalculate the count and refresh the badge.

What it does NOT fix:
- Background pushes still depend on the `send-push` edge function being redeployed. Until it is redeployed, old code may still send increment-style or missing badge counts.
- If the realtime connection drops or a notification is inserted by a path that bypasses `notifyInstructors`, the foreground badge may not refresh until the user switches apps back/forth.

Plan:

1. Redeploy the `send-push` edge function
   - Run `npx supabase functions deploy send-push` so the background push payload uses the absolute badge count.

2. Add a OneSignal foreground received/opened listener in `__root.tsx`
   - On `OneSignal.Notifications.addEventListener('foregroundWillDisplay', ...)`, dispatch a `dsm-notifications-updated` window event so `useUnreadCount` re-fetches immediately.
   - On `OneSignal.Notifications.addEventListener('click', ...)`, do the same and navigate to the notification URL if present.
   - This makes the badge refresh even if Supabase realtime misses the insert.

3. Harden `useUnreadCount` re-fetch triggers
   - Keep the existing focus/visibility change listeners.
   - Add an app-state resume listener (Capacitor `App.addListener('resume', ...)`) to re-fetch when returning from background.

4. Add concise diagnostics
   - Log the fetched unread count and the badge set/clear result in `useUnreadCount` (already partly present).
   - Log in `send-push` when the unread count read returns zero or the push payload badge count.

Out of scope:
- No changes to iOS Xcode project.
- No changes to notification permission flow or UI.

Success criteria:
- Foreground: a new notification arrives (or is inserted) and the app icon badge updates within seconds without app restart.
- Background: a new push arrives and the app icon badge matches the unread count when the user returns to the home screen.
