# Redeploy and verify Google Calendar instant updates

## Confirmed cause
The live `sync-google-calendar` service is outdated. On 8 September 2026 it received a `watch` request with the production webhook URL, but returned the legacy normal-sync response (`synced: 438`) instead of the current watch response (`watching` / `failures`). The app therefore correctly reports that the calendar service needs redeploying.

## Plan
1. Redeploy the existing `supabase/functions/sync-google-calendar/index.ts` function to the connected Supabase project without changing its code or the calendar sync architecture.
2. Confirm the published app exposes `https://app.everydriver.pro/api/public/google-calendar-webhook`.
3. Turn on Instant updates again and inspect the exact watch response:
   - success: at least one selected calendar appears in `watching`;
   - selection issue: `no_calendars_selected`;
   - Google rejection: preserve and report the returned Google status/message.
4. Verify an actual Google event change reaches the webhook and then appears in Schedule without pressing Sync.
5. Leave standard sync, Schedule display, Gap Filler, SMS, pupil matching, and `capacitor.config.ts` unchanged.

## Success criteria
- The watch request no longer returns the legacy `synced/eventsImported` response.
- The Instant updates switch stays enabled after Google registers a channel.
- A Google event create/update/delete is reflected automatically.
