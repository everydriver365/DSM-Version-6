# Restore iOS alerts and app-icon counters

## Confirmed causes

- Most notification-producing flows only insert into `instructor_notifications`; they do not invoke `send-push`. Only lesson reminders and test-swap interest currently call the native push sender, so ordinary activity cannot appear as an iOS alert.
- OneSignal registration reads the subscription ID only once immediately after initialization and again when the app returns to the foreground. If the ID is not ready at those moments, no listener captures it later.
- `OneSignal.login(user.id)` is currently conditional on already having a subscription ID. This can leave the device without the instructor external ID during the registration race.
- The instructor upsert does not inspect the returned Supabase error, so the app can log “player ID saved” when persistence failed.
- `useUnreadCount()` owns `Badge.set()`, but it is only mounted by selected pages, not by the root. On pages such as Home, the foreground refresh event therefore has no global badge consumer.
- The shared OneSignal payload already contains the correct iOS absolute badge fields, and the iOS target already has the production APNs entitlement, remote-notification mode, OneSignal package, and Capacitor Badge package.

## Implementation

1. **Make device registration reliable**
   - In the root native initialization, call `OneSignal.login(user.id)` as soon as both OneSignal and Supabase authentication are ready.
   - Save the current subscription ID when available and subscribe to OneSignal subscription-change events so a later-issued or replaced ID is persisted immediately.
   - Check and log Supabase persistence errors instead of logging unconditional success.
   - Remove listeners during cleanup and retain the foreground retry as recovery.

2. **Send every persisted instructor notification to iOS**
   - Add one centralized, server-side dispatch path from new `instructor_notifications` rows to `send-push`, rather than relying on individual screens to remember a second call.
   - Pass the notification title, body, type, destination, and instructor ID through that path.
   - Prevent duplicate pushes for flows that already call `send-push` directly by moving them onto the centralized path or marking dispatched rows idempotently.
   - Respect `notification_settings.push_enabled` and the relevant per-notification preference before delivery.

3. **Make badge counts accurate**
   - Mount the unread-count/badge synchronization once at the app root so it runs on every authenticated screen.
   - Keep unread `instructor_notifications` as the single source of truth and continue using absolute `Badge.set({ count })` values.
   - Because centralized dispatch starts from an already-inserted row, change `send-push` to send the exact unread count rather than `unreadCount + 1`; this removes the current race and off-by-one behavior.

4. **Validate end to end**
   - Verify permission granted, OneSignal subscription ID present, external ID equal to the Supabase user ID, and the same subscription ID saved on the instructor row.
   - Generate one real notification while the app is backgrounded and confirm: one OneSignal delivery, one visible iOS alert, and badge `1`.
   - Generate a second notification and confirm badge `2`; mark one/read all and foreground the app to confirm reconciliation.
   - Confirm no duplicate pushes and confirm disabled notification preferences suppress delivery.

## Release requirement

A fresh Capacitor sync/Xcode archive and install is required if the phone does not already contain the current OneSignal and Capacitor Badge native packages and APNs entitlement. Web updates alone cannot add those native components.

## Expected files

- `src/routes/__root.tsx`
- `src/hooks/useUnreadCount.ts` only if a small root-safe API adjustment is needed
- `src/routes/api/public/send-lesson-reminders.ts`
- `supabase/functions/send-push/index.ts`
- A Supabase migration/server dispatch file for centralized, idempotent notification delivery

`capacitor.config.ts` will not be modified.
