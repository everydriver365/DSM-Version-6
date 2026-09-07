# Why "Sync failed" appears — and how to fix it

## What is happening

The Calendar sync button calls the Google sync service and only shows a green
message when that service reports success. Everything else becomes the single
word "Sync failed" — the real reason is thrown away, so right now nobody
(including me) can see why it stopped.

Two things are certain from the code:

- If the call itself errors (network, service crash, non-JSON reply), the page
  shows "Sync failed" with no detail at all.
- If the service replies with a problem, only `message` or `error` is shown;
  the Google-side status code (for example an expired Google sign-in) is
  ignored, so an expired connection also reads as a bare "Sync failed".

The most common real cause of this pattern is that the Google connection's
saved permission has expired or been revoked, so Google refuses the request and
the sync stops. That is a strong suspicion, not yet confirmed — the current
message deliberately hides it.

## Step 1 — make the failure tell the truth

In the sync handler on the Calendar sync page:

- Show the actual reason returned by the service, including the Google status
  code, instead of a bare "Sync failed".
- When the reply isn't readable at all, show the HTTP status ("Sync failed
  (503)") so a service outage is distinguishable from a Google refusal.
- Log the full reply to the browser console for diagnosis.

## Step 2 — handle the expired-Google-sign-in case properly

When the failure is an authorisation problem (Google returns 401/403, or the
refresh of the saved permission fails):

- Show "Your Google Calendar connection has expired — please reconnect."
- Mark the connection as needing attention on the page so the Connect button
  reappears, instead of leaving a "Connected" badge that never syncs.

## Step 3 — confirm the cause, then fix it

Once the real message is visible, one press of Sync now names the cause. If it
is the expired connection, disconnecting and reconnecting Google restores
syncing and no further code change is needed. If it turns out to be something
else (for example a database conflict during import), I will come back with a
targeted fix for that specific error rather than guessing now.

## Scope

Only `src/routes/calendarsync.tsx` changes. The Google sync service, the
Schedule display, ICS feeds and calendar data are untouched.
