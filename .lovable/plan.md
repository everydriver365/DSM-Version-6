# Make a YES create a real diary booking

## What happens today

When a pupil texts YES, the incoming-text handler already finds their open offer, re-checks the diary for clashes and creates a lesson row. Two things stop that lesson looking like a proper booking in your diary:

1. The new row has no lesson type set, so the diary can't style or label it the same way as a lesson you added by hand.
2. Nothing tells the open app that a new lesson exists, so the diary only shows it after a refresh.

The handler also still needs to be deployed for any of this to run live.

## What I'll change

1. Set the booking row up exactly like a hand-added lesson: date, time, length, pupil, instructor, confirmed status, price/payment as now, plus the missing lesson type ("lesson") and the pupil's usual pickup address when they have one.
2. Read the new booking back after creating it and log its date, time and pupil, so the function's log proves the row landed.
3. Make the diary and home screen pick up new bookings without a manual refresh (re-check when the screen regains focus).
4. Keep the existing safety: if the slot has been taken in the meantime, nothing is booked, the pupil gets a "that slot has gone" text and you get a notification.

## Not changing

Gap detection, pupil matching, the outgoing text sender, the Google Calendar integration, the database structure, and capacitor.config.ts.

## Technical notes

- `supabase/functions/receive-sms/index.ts` → `autoBookOffer()`: extend the `lessons` insert with `lesson_type: "lesson"` and `pickup_location` from the pupil's address; add `.select("id, lesson_date, lesson_time, pupil_id").single()` and log the result.
- `src/routes/schedule.tsx` / `src/routes/home.tsx`: bump the existing lesson reload key on `visibilitychange`/window focus rather than adding new fetch logic.
- Verification: `tsgo -p tsconfig.json` plus the full `bun test` suite (76 tests).
- You'll still need to redeploy `receive-sms` in Supabase after the change; I'll paste the final file for copy/paste.
