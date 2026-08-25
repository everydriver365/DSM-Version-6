# Why Google sync doesn't work — findings and fix plan

## What I checked

- Every function the app calls exists on the Supabase project (probed live):
  `google-calendar-auth` (401 without a token — correct), `google-calendar-callback` (302),
  `sync-google-calendar` (401 without a token — correct), `sync-external-calendar` (401),
  `push-lesson-to-google` (400/200), `google-calendar-sync` (200).
- Only 3 of those have source in this repo: `google-calendar-auth`, `google-calendar-callback`,
  `push-lesson-to-google`. **`sync-google-calendar` and `google-calendar-sync` are deployed but their
  code is not in the project**, so nothing about their behaviour can be read or changed from here.
- Client call sites: `src/routes/calendarsync.tsx` (`sync()` line 377), `src/routes/schedule.tsx`
  (`handleSync` line ~1120), and pushes via `src/lib/calendarSyncPrefs.ts`.

## Confirmed problems

1. **Two competing push functions.** Lesson saves in `AddLessonSheet.tsx` and `lessons.edit.$id.tsx`
   call `push-lesson-to-google`, while `calendarSyncPrefs.pushLessonToGoogle` (used by
   `lessons.new.tsx`, `cancelLesson.ts`, and the same sheets) calls a different function,
   `google-calendar-sync`. Probed with a dummy payload, `google-calendar-sync` returns
   `{"ok":true,"skipped":true}` — it silently skips rather than pushing. Every push is fire-and-forget
   and never surfaced, so a permanent no-op looks identical to success.

2. **Two competing connection stores.** `google-calendar-callback` writes tokens onto the
   `instructors` row only. The UI treats `google_calendar_connections` as the source of truth
   (`calendarsync.tsx` line 270) and `disconnect()` deletes from it. Nothing ever writes that table,
   so state depends entirely on the `instructors` mirror.

3. **OAuth always returns to production.** `google-calendar-callback` hard-codes
   `APP_URL = https://app.everydriver.pro`. Connecting from the preview or from the iOS shell lands on
   the production web app, so the "connected" toast and auto-sync never run in the context the user
   started in.

4. **Narrow scope.** The consent request asks for `calendar.events` only. That covers reading and
   writing events on `primary`, but not listing calendars or per-calendar metadata — if the deployed
   sync function calls `calendarList` or a non-primary calendar, Google returns 403.

Unverified (needs the deployed source or the function logs): whether `sync-google-calendar` refreshes
an expired access token. `push-lesson-to-google` does; if the sync function doesn't, Google sync stops
working roughly an hour after connecting and silently returns zero events.

## Plan

1. **Pull the two missing functions into the repo.** Run `supabase functions download
   sync-google-calendar` and `google-calendar-sync` (or paste them in) under `supabase/functions/`.
   Without this, the actual sync logic can't be diagnosed or fixed — everything else is guesswork.
2. **Read their logs for the real error.** Supabase Dashboard → Edge Functions → Logs for
   `sync-google-calendar`, immediately after pressing Sync now. That will show whether it's a 401 from
   Google (expired token), a 403 (scope), or an empty result.
3. **Consolidate the push path.** Point `calendarSyncPrefs.pushLessonToGoogle` at
   `push-lesson-to-google` (the one whose code we have and which does token refresh and handles
   create vs update), remove the duplicate direct `fetch` calls in `AddLessonSheet.tsx` and
   `lessons.edit.$id.tsx`, and add `delete` handling to that function so cancellations remove the
   Google event.
4. **Make the callback return where the user came from.** Pass an origin/return URL through the OAuth
   `state` (alongside the instructor id) and redirect to it, falling back to
   `https://app.everydriver.pro`.
5. **Single connection store.** Have `google-calendar-callback` also upsert
   `google_calendar_connections`, or drop that table from the UI and read the `instructors` mirror only.
6. **Surface failures.** Stop swallowing push errors: log the status and body, and show a toast when a
   push fails, so the next regression isn't invisible.
7. **Widen scope only if step 2 shows a 403** — adding `calendar.readonly` requires users to reconnect.

## Note

Steps 3–6 are safe to do now. Step 1 gates the actual root cause: until `sync-google-calendar` lives in
this project, its import behaviour can't be corrected from here.
