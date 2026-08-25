# Every Driver Pro — audit findings and remediation order

Audit only: nothing was changed. Below are the verified findings and the safest order to fix them.

## Status summary (verified from the repository)

| Area | Status | Evidence |
| --- | --- | --- |
| Auth (sign in / session / reset) | PARTIAL | No `_authenticated` gate; every page self-checks and redirects to `/login` (`__root.tsx`, ~20 route files). Original destination is lost on redirect. |
| Google Calendar | PARTIAL / UNVERIFIED | 3 push paths + 2 sync paths; 3 called functions have no source in repo. |
| Push notifications | FAIL | Player ID read once, badge API does not exist, no badge fields in payload. |
| Payments (Square) | PARTIAL | Webhook is correct and signature-verified, but `square-create-payment-link` / `square-oauth-start` source is missing and webhook URL in docs points at the old domain. |
| Edge function inventory | FAIL | 15 functions called; only 7 have source in the repo. |
| Error surfacing | PARTIAL | 44 empty/ignored catch blocks; several fire-and-forget calls. |
| Navigation | PARTIAL | Deep-link targets from notifications are hard-coded and some do not match routes. |

## Critical failures

1. **Push notifications cannot reliably reach a device.**
   - `src/routes/__root.tsx` calls `OneSignal.User.pushSubscription.getIdAsync()` once, immediately after `initialize`. On iOS the subscription ID usually does not exist yet, so `instructors.onesignal_player_id` stays null and `send-push` short-circuits.
   - There is no observer for the subscription ID becoming available, and no re-save on login or app resume.
   - `App.clearBadge()` / `App.setBadge()` (`__root.tsx`, `src/hooks/useUnreadCount.ts`) are not part of `@capacitor/app`. No badge plugin is installed, so badges never appear.
   - `supabase/functions/send-push/index.ts` sends no `ios_badgeType` / `ios_badgeCount`, so a closed app never updates its icon count.
   - Legacy `despia://` registration calls remain in `__root.tsx` alongside OneSignal — dead code from the previous wrapper.

2. **Three Google Calendar functions are called but have no source in the repository**: `sync-google-calendar`, `google-calendar-sync`, `sync-external-calendar`. They cannot be reviewed, fixed, or redeployed from here.

3. **Two sources of truth for the Google connection.**
   - `google-calendar-callback` writes tokens only to `instructors`.
   - `calendarsync.tsx` reads `google_calendar_connections` to decide "connected".
   - So a successful OAuth can still render as "not connected", and `sync()` then calls the ICS path instead of the Google path.

## High priority

4. **Three competing lesson→Google push paths**: `push-lesson-to-google` (source present) called from `AddLessonSheet.tsx` and `lessons.edit.$id.tsx`; `google-calendar-sync` called from `calendarSyncPrefs.pushLessonToGoogle` (used by `cancelLesson.ts`); plus `sync-google-calendar` fired on save. Cancellation and creation therefore use different backends.
5. **Fire-and-forget calendar pushes.** `pushLessonToGoogle` is `void`-invoked with no error handling, and `AddLessonSheet` / `lessons.edit.$id` wrap their fetches in silent try/catch. A failed Google write still shows "Lesson saved".
6. **OAuth callback hard-codes `https://app.everydriver.pro`.** Preview and local sessions always land on production after connecting, which is why the "connected" state is frequently lost.
7. **Scope is `calendar.events` only.** Any code path that lists calendars or reads colours will 403.
8. **`push-lesson-to-google` ignores Google API errors** — returns `{ ok: true, eventId: undefined }` when Google rejects the write, and returns `{ ok: true, skipped: "no google calendar" }` when not connected. Callers cannot distinguish success from skip.
9. **Square link functions missing from repo** (`square-create-payment-link`, `square-oauth-start`, `send-payment-email`) — called from 6+ screens including `take-payment.tsx`, `UnifiedPaymentSheet.tsx`, `jobs.tsx`, `quote.$token.tsx`.
10. **Square webhook URL documented as `drivingschoolmanager.co.uk`** while the app is on `app.everydriver.pro`. Square signs the notification URL, so a mismatch fails signature verification and payments never settle.

## Medium priority

11. **No route-level auth gate.** Each page performs its own `getUser()` + redirect. Session expiry mid-use produces inconsistent behaviour per page, and the intended destination is never restored after login.
12. **Anon key and project URL hard-coded** in `calendarsync.tsx` and many other files instead of `import.meta.env`. Not a secret leak, but it blocks environment switching.
13. **Notification tap routing** in `__root.tsx` maps to `/messages`, `/payments`, `/schedule`, `/pupils`, `/enquiries`, `/dsm-live`, `/notifications` with `as never` casts — no compile-time check that each target exists or that per-record deep links (message thread, specific lesson) are honoured. All taps land on list screens.
14. **Other functions with no source in repo**: `award-points`, `send-quote`, `send-terms-email`, `send-contact-notification`, `send-welcome-email`, `send-managed-enquiry-email`, `check-domain`, `register-domain`, `find-cheap-fuel`.
15. **`useUnreadCount` re-subscribes to all `instructor_notifications` changes** without an instructor filter — noisy refetches for every row in the table.

## Low priority / dead code

16. Legacy `despia` push registration block in `__root.tsx`.
17. Duplicate route pairs suggesting older implementations still routable: `mtd.tsx` / `month-to-date.tsx`, `eod.tsx` / `end-of-day.tsx`, `weeklyreport.tsx` / `weekly-report.tsx`, `waitlist.tsx` / `waitinglist.tsx`, `quotes.tsx` / `quotes.index.tsx`, `live.tsx` / `livesession.tsx`, `dsm-live.tsx` / `live-news.tsx`.
18. 44 empty or comment-only catch blocks, concentrated in `driving-test.$pupilId.tsx`, `home.tsx`, `test-day.$pupilId.tsx`, `live.tsx`, `haptics.ts`.

## Unverified (cannot be confirmed from the repository)

- Whether the missing functions are actually deployed and what they do.
- APNs key validity, OneSignal dashboard config, Xcode capabilities beyond `App.entitlements` (which currently declares `aps-environment: development` — this must be `production` for TestFlight/App Store builds).
- Actual database rows, RLS behaviour at runtime, orphaned records.

## Recommended remediation order

1. **Pull the missing Edge Function sources** from Supabase into `supabase/functions/` so the calendar, payment and email paths become reviewable. Nothing else on this list can be safely finished first.
2. **Fix push registration** — replace the one-shot `getIdAsync()` with a subscription-change observer plus a re-save on login and on app resume. Test: fresh install, check `instructors.onesignal_player_id` is populated.
3. **Fix badges** — install a real badge plugin, replace the non-existent `App.setBadge`/`clearBadge` calls, and add `ios_badgeType`/`ios_badgeCount` to the `send-push` payload. Test: closed-app notification increments the icon count.
4. **Set `aps-environment` to `production`** for release builds.
5. **Unify the Google connection store** — one table, written by the callback and read by the UI; keep the other as a mirror only. Test: connect, hard-refresh, state persists.
6. **Make the OAuth callback redirect origin-aware** (pass the origin through `state`) instead of hard-coding production.
7. **Collapse the three push paths to one** (`push-lesson-to-google`), and make it return a real error instead of `ok: true` on Google failure. Update create, edit and cancel to use it and to surface failures with a toast.
8. **Confirm the Square webhook URL and `SQUARE_WEBHOOK_URL` secret both point at the live domain**, then run one real payment end-to-end and confirm the ledger settles.
9. **Add a single `_authenticated` route gate** with redirect-back, and remove the per-page session checks incrementally.
10. **Widen the Google scope** to include `calendar.readonly` if calendar listing/colour reads are to stay.
11. **Tidy** — remove the despia block, retire the duplicate routes after confirming which are linked, and replace silent catches on user-facing actions with toasts.

Each step is independent of the ones after it; steps 2-4 can ship together, and nothing here requires a schema change except step 5, which only needs a backfill of existing connections.
