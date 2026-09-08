# Turning on instant Google Calendar updates

The message you saw ("the calendar service needs redeploying") is the app telling you that the calendar service running on your Supabase account is still an older version. The new instant-updates code exists in this project but has not been sent to Supabase yet. Nothing in the app needs changing — it just needs deploying.

## Step 1 — Deploy the calendar service

Easiest route (no tools to install), in your Supabase dashboard:

1. Open your project at supabase.com.
2. Go to Edge Functions in the left menu.
3. Find `sync-google-calendar` and open it.
4. Choose to edit/replace the code, paste in the current contents of `supabase/functions/sync-google-calendar/index.ts` from this project, and deploy.

If you prefer the command line instead:

```text
supabase functions deploy sync-google-calendar
```

Do not deploy `gc-webhook` — that one is for payments, not Google Calendar.

## Step 2 — Publish the app

The address Google sends its notifications to lives inside the app itself:

```text
https://app.everydriver.pro/api/public/google-calendar-webhook
```

Publish the app so that address is live. If it is not reachable, Google refuses to switch instant updates on.

## Step 3 — Check the service settings

In Supabase, under Edge Functions settings, confirm these exist:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_WEBHOOK_URL` (optional — only if you want a different address from the one above)

## Step 4 — Switch it on and test

1. Open the Calendar sync screen in the app.
2. Make sure at least one calendar is ticked.
3. Turn on Instant updates.
4. Add or move an event in Google Calendar and watch it appear in your schedule without pressing Sync.

## If it still refuses

Tell me the exact wording you see and I will read the calendar service logs. The three likely causes, in order:

- No calendar selected.
- The deploy in Step 1 did not take effect.
- Google needs `everydriver.pro` verified as a domain you own (done once in Google Search Console).

No code changes are part of this plan; if the message changes after deploying, I will investigate from there.
