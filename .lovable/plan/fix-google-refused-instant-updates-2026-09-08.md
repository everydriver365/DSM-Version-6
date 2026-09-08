# Fix "Google refused instant updates"

That message is the fallback shown when Google's answer comes back with no reason attached. Three things can produce it, and right now they all look identical to you.

## What can cause it

1. **No calendars are ticked.** If nothing is selected, nothing is registered, so the result is empty and you get the generic refusal — even though Google was never asked.
2. **The old calendar function is still live.** If the redeployment hasn't happened, the new "instant updates" request isn't understood, and the reply comes back empty.
3. **Google won't accept the notification address.** Google only sends live notifications to a web address on a domain it can confirm you own (verified in Google Search Console) and that answers publicly. If `app.everydriver.pro` isn't verified for the same Google account, Google rejects it — with a reason we currently truncate and sometimes lose.

## What I'll change

- Show the real reason every time: if no calendars are ticked, say "Pick at least one calendar first"; if the function is out of date, say so; otherwise show Google's own wording (e.g. address not verified, address unreachable).
- Return a clear reason from the calendar service when nothing was attempted, instead of an empty result.
- Log Google's full rejection text so it can be read from the function logs.
- Add a small line under the Instant updates toggle stating the notification address in use, so it can be pasted into Google Search Console for verification.

No changes to the schedule display, sync behaviour, lessons, gap filler, SMS, or `capacitor.config.ts`.

## Files

- `src/routes/calendarsync.tsx` — precise error messages, guard for no calendars selected, show the notification address.
- `supabase/functions/sync-google-calendar/index.ts` — return `{ reason: "no_calendars_selected" }` when selection is empty; keep full Google error text in the response and logs.

## After the change

You press the toggle once and get a specific message. If it says the address isn't verified, the fix is to verify `everydriver.pro` in Google Search Console under the same Google account, then press it again. The rest of the calendar sync keeps working as it does now (polling), instant updates just make it faster.
