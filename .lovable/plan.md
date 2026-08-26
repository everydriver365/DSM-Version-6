# Why the banner appears but the icon badge stays empty

## What the code currently does

- `supabase/functions/send-push/index.ts` is the only place that sets an iOS badge on a push. It counts unread rows in `instructor_notifications`, then sends `ios_badgeType: "SetTo"` with `ios_badgeCount = unread + 1`.
- Only two things call that function: the lesson reminder route (`src/routes/api/public/send-lesson-reminders.ts`) and the test-swap flow (`src/routes/test-swap.tsx`).
- The in-app badge sync lives in `src/hooks/useUnreadCount.ts` (`Badge.set({ count: unreadCount })`), and that hook is only mounted on a few pages (pupils, more, enquiries, courses) — not at the app root.

## Most likely causes (in order)

1. The banner you received did not come from `send-push`. A OneSignal dashboard test message, or any other sender, carries no `ios_badgeCount`, so iOS shows the banner and leaves the icon untouched.
2. Badge authorisation was never granted. iOS treats alert and badge as separate permissions; if the prompt was answered before badge was requested, or badge is off in iOS Settings > Notifications > Every Driver Pro, alerts still show and badges are silently dropped.
3. The native badge plugin (`@capawesome/capacitor-badge`) was added after the last Xcode archive, so the build on the phone does not contain it — in-app badge setting then does nothing.
4. Opening the app clears nothing, but because `useUnreadCount` only runs on some pages, any badge set by a push can be left stale or never corrected.

Which one it is cannot be settled from source alone — it depends on which sender produced the banner and what the device permission state is.

## Plan

1. Diagnose first (no behaviour change): send one push through `send-push` for your instructor ID and read the edge function log line `[send-push] sending to subscription: … badge: N`. If N is present and the icon stays blank, the cause is device-side permission or a stale native build, not the payload.
2. Check iOS Settings > Notifications > Every Driver Pro and confirm "Badges" is on. If it is off, that alone explains the symptom.
3. Move badge syncing to the app root so every screen keeps the icon in step with the real unread count, instead of only the four pages that currently mount the hook.
4. Make `send-push` the single push path: route every `instructor_notifications` insert through it so all alerts carry a badge count, not just reminders and test swaps.
5. Re-archive in Xcode and install a fresh TestFlight/device build so the badge plugin is actually present natively, then verify the icon increments with the app backgrounded.

## Technical notes

- `badgeCount = unread + 1` assumes the notification row is written after the push. If the row is written first, the badge overshoots by one; worth aligning while touching this.
- Badge changes are native-only; the Lovable preview and browser cannot show them.
