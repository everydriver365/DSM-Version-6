# Live YES test with a real pupil

Goal: send one genuine Gap Filler offer, have the pupil reply YES, and confirm the booking appears in the diary and the reply appears in their message thread.

## Before sending

Quick read-only checks so the test isn't wasted:

- Confirm the pupil has a valid mobile number stored.
- Confirm there is a real free slot in the next few days that suits them.
- Confirm the text replies log page is reachable (Settings > Text replies), so we can see exactly what happens to the reply.

## The test

1. Open Gap Filler, pick a genuine free slot, select the one pupil, and send the offer.
2. Confirm the app reports the message as sent (not queued or failed).
3. Ask the pupil to reply YES.

## What we check afterwards

- Text replies log: a new row with the time, the pupil's name, their message, and an outcome of "booked".
- Diary (Schedule): a confirmed lesson on the right date and time, right length, right pupil, with their pickup address.
- Home screen: the lesson shows in today/next up if it's soon.
- Pupil's message thread: their YES appears, plus the confirmation text back to them.
- Gap Filler: the slot no longer shows as free, and the offer is closed.

## If the YES doesn't book

We work through the log outcome in order:

- No row at all: the reply never reached us — check the Twilio number's webhook points at the receive-sms function.
- Row saying the number didn't match a pupil: the stored number differs in format from what the network sends.
- Row saying no open offer: the offer wasn't in an open state when the reply arrived.
- Row saying clash: something else was booked in that slot first.
- Row saying booking error: the exact database error is in the details column.

I fix whatever the log points at, and we retest.

## Not touched

Google Calendar, gap detection, pupil matching, the outbound SMS sender, the database structure, and the app configuration file all stay as they are.
