# Two message popups: what triggers each

## What's happening

Two independent alert systems are mounted side by side in `src/routes/__root.tsx` (lines 757-758), and an incoming message trips both.

### 1. Navy/blue card at the top — `MessageAlert`

File: `src/components/dsm/MessageAlert.tsx`

Triggered by a Supabase realtime subscription to raw message rows:

```text
INSERT on chat_messages       where instructor_id = me   (and sender_type != 'instructor')
INSERT on instructor_messages where to_instructor_id = me
```

It looks up the sender's name, then shows a navy card pinned to the top
(`position: fixed; top: safe-area + 12px`) for 5 seconds. It suppresses itself
only while you are already on a `/messages*` route.

### 2. White card halfway down — `EventToast`

File: `src/components/dsm/EventToast.tsx`, driven by `EventToastController`.

Triggered by a different subscription in `__root.tsx` (lines 610-646):

```text
INSERT on instructor_notifications where instructor_id = me
```

Every new notification row is mapped to an event kind; anything whose `type`
doesn't match job / enquiry / booking / lesson / call falls through to
`"message"`, and `emitLiveEvent` shows the white toast. It now sits mid-screen
because of the recent change to `top: 50%; marginTop: -40`.

Admins get a third path into the same toast: new `job_offer_messages` rows
(lines 649-683) also call `emitLiveEvent`.

### Why both fire for one message

A new message writes a `chat_messages` / `instructor_messages` row (fires
MessageAlert) and a matching `instructor_notifications` row is also created
(fires EventToast). So one message = two popups, in two different places, with
two different designs.

Note: no local migration in `db/` inserts the notification row for a chat
message, so the notification is created either by a database trigger in
Supabase or by the sender's client path. Step 1 below confirms which.

## Proposed fix

1. Confirm the duplication source: check whether a Supabase trigger writes an
   `instructor_notifications` row of type `message`/`chat` when a message
   arrives.
2. Make message alerts single-source. Recommended: keep the navy `MessageAlert`
   as the message UI (it has sender name, avatar, preview, deep link), and have
   the `EventToast` subscription in `__root.tsx` skip notifications that are
   message notifications. Every other event kind (job, enquiry, booking, call,
   admin job-offer messages) keeps using `EventToast` unchanged.
3. Settle the `EventToast` position, since mid-screen is what made the overlap
   obvious.

## Decisions needed

- Which popup should win for messages: the navy top card, or the white toast?
- Where should the surviving `EventToast` sit: top, middle, or above the bottom nav?
