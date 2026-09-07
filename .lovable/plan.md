# Gap filler: make your settings authoritative again

You're right — silently falling back to 09:00–18:00 hides the real problem and produces wrong gaps. The fallback should go, and when your settings can't be read the page should say exactly why.

## What I checked

Gap filler reads your working hours from the same place the Schedule page does (the instructor record, matched on your account ID, with a reduced-column retry). The queries are effectively identical, so nothing in the code obviously explains a read failure. What I can't do from here is run the page as you: there is no signed-in session in my sandbox, so I cannot see the actual error the page hit. The current code swallows that error into a console warning, which is why we still don't know the cause.

## The fix

1. Remove the "use 09:00–18:00 defaults" behaviour. If your working hours, working days, per-day hours or buffer can't be read, Gap filler shows an error instead of guessing.
2. Turn the swallowed warning into a visible, specific message on the page, naming which part failed and the exact reason — for example "couldn't read your profile", "no profile record found for this account", or a permissions message from the database.
3. Add a small "Diary settings" line on the page showing the hours, days and travel buffer actually being used, so you can confirm at a glance the gaps are calculated from your real settings.
4. Keep the "Try again" button, so a one-off network blip is easy to retry.

Once that's in place, open Gap filler and tell me the message you see — that single line will identify whether the record is missing, blocked by permissions, or stored under a different ID — and then I can fix the actual cause.

## Technical notes

- File touched: `src/routes/gaps.tsx` only. `capacitor.config.ts` untouched.
- Replace the `try/catch` + defaults block around the `instructors` select with: full-column select, reduced-column retry on error, `user_id` fallback lookup, then a hard failure path that sets `loadError` with the concrete Supabase error message or "no instructor record found".
- Keep the existing non-fatal handling for calendar blocks, recurring blocks, time off and pupils; only profile settings become fatal.
- Render the resolved work start/end, working days and `lesson_buffer_after` in a compact settings summary above the gap list.
- Verify with `bunx tsgo --noEmit` and the existing `src/lib/gapDetection.test.ts` suite.
