# Auto-book gap offers when a pupil replies YES

Two things to fix, in order.

## 1. The reply isn't reaching the app (must be diagnosed first)

Your pupil's "YES" arrives on your Twilio number, but nothing appeared in
their message thread. Nothing can happen next until that reply lands in the
app, so this is step one. The cause is not yet confirmed — the plan starts by
confirming it rather than guessing.

Checks, in order:

1. Confirm the incoming-message handler is actually deployed and that Twilio
   is pointed at it (a mismatch between the address Twilio calls and the
   address the handler expects makes every reply fail its security check and
   be silently dropped).
2. Read its logs for the time you replied, to see whether the message arrived
   at all, failed the security check, or arrived but matched no pupil.
3. Confirm the pupil's saved phone number matches the number they texted from
   (matching is done on digits and on the last 10 digits).
4. Confirm the fields the handler reads when looking pupils up actually exist
   in the live pupil records — if that lookup errors, every reply is dropped
   with no visible sign.

Whatever the logs show gets fixed at the source. No workaround, no polling.

## 2. Replying YES books the lesson automatically

Once replies land reliably, acceptance stops waiting for you.

When an incoming message is recognised as an acceptance ("yes", "yep", "ok",
"confirm", and the existing variants):

1. Find that pupil's most recent still-open gap offer. If there is none, the
   message is just saved as a normal message and nothing else happens.
2. Re-check the slot against your diary — lessons, Google calendar busy time,
   recurring blocks and time off — using the existing double-booking check.
3. If it's clear: create the lesson (existing pricing, discount-code and
   prepaid rules unchanged), mark the offer accepted, and — importantly —
   close any other offers still out for that same slot so two pupils can't
   both claim it.
4. Notify you ("Lesson booked — <pupil> confirmed <when>") and text the pupil
   the confirmation.
5. If the slot was taken in the meantime, no lesson is created; the pupil gets
   "sorry, that slot has just gone" and you get a notification saying so.

The manual confirm banner in the message thread stays as a safety net for
cases the automatic path skipped (offer already gone, clash, ambiguous
reply) — it just won't normally be needed.

## Technical notes

- Acceptance handling moves into `supabase/functions/receive-sms/index.ts` so
  it runs whether or not the app is open, reusing the wording rules currently
  in `src/routes/messages.$pupilId.tsx` (extracted to a shared module).
- Conflict checking reuses `src/lib/bookingConflicts.ts` logic; the database
  overlap constraint from `db/068` remains the final guard.
- Confirmation texts are queued into `sms_queue` and sent by the existing
  `send-sms` function. `send-sms` itself is not modified.
- Competing offers for the same instructor/date/time are marked `expired`.
- No schema changes beyond, if needed, an `expired` status value already
  allowed by the existing free-text status column.
- `capacitor.config.ts`, Google Calendar sync/display, gap detection and pupil
  matching are untouched.

## Limitation

I can't see your Twilio console or deploy Edge Functions for you, so step 1
may need you to redeploy the incoming-message function or correct the webhook
address in Twilio; I'll tell you exactly which once the logs are read.
