# Fix badge counter updates and unclear notification banners

Target: the native app installed from Xcode/TestFlight.

## What's wrong now

- The badge number is computed as "current unread + 1" in the push sender, but the different flows insert the in-app notification at different times (some before the push, some after). So the number sent to the phone is sometimes one too high, sometimes one too low, and repeated pushes can send the same number twice — it looks like the counter never moves.
- Screens that insert a notification row directly (without going through the shared notify helper) never send a push at all, so the badge only corrects itself the next time you open the app.
- Marking notifications as read does not push a new badge value, so the icon stays stuck until the app is opened.
- Banner titles are generic ("Every Driver Pro"), so the alert doesn't say what it's about.

## Changes

1. **One consistent order: insert first, then push.**
   - `src/lib/notify.ts`: insert the `instructor_notifications` rows, then call `send-push`.
   - `supabase/functions/send-push/index.ts`: send the exact unread count (`SetTo`, no `+ 1`).
   - `src/routes/api/public/send-lesson-reminders.ts`: same order, so lesson reminders match.

2. **Every notification produces a push.**
   - Find screens that insert into `instructor_notifications` directly and route them through `notifyInstructors()` so the badge and banner always follow.

3. **Badge refresh when notifications are read.**
   - When the app marks notifications read, set the native badge to the new unread count immediately (already handled by the root unread-count hook — verify it fires on the read action and on the notifications list).

4. **Descriptive banner titles ("Brand + type").**
   - Add a small type-to-label map used by `send-push` when no explicit title is supplied, producing titles like:
     - `EDP · New enquiry`
     - `EDP · Lesson reminder`
     - `EDP · Test day tomorrow`
     - `EDP · Payment received`
     - `EDP · New message`
     - `EDP · Job offer`
   - Keep the detail line as the body (pupil name, time, place).
   - Update the call sites that currently pass a bare title so their banners use the same shape.

## Technical notes

- Badge value is always absolute (`ios_badgeType: "SetTo"`), sourced from the unread count in `instructor_notifications`, never incremented client-side.
- No changes to `capacitor.config.ts`, the iOS project, or the OneSignal app ID.
- After deploying, the edge function `send-push` must be redeployed for the badge and title changes to take effect.

## Verification

- Generate a notification with the app backgrounded: one banner reading `EDP · <type>` with a meaningful detail line, badge goes to 1.
- Generate a second: badge goes to 2.
- Mark all read and foreground the app: badge clears.
