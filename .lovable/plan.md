# One notification banner for everything (iOS style)

## What's happening today

Two independent alert systems are mounted side by side in `src/routes/__root.tsx` (lines 757-758), and an incoming message trips both.

**Navy card at the top — `MessageAlert`** (`src/components/dsm/MessageAlert.tsx`)
Realtime subscription to raw message rows:

```text
INSERT on chat_messages       where instructor_id = me   (and sender_type != 'instructor')
INSERT on instructor_messages where to_instructor_id = me
```

Shows a navy card at the top for 5s with sender avatar, name and preview.

**White card mid-screen — `EventToast`** (`src/components/dsm/EventToast.tsx`)
Driven by a subscription in `__root.tsx` (lines 610-646):

```text
INSERT on instructor_notifications where instructor_id = me
```

Every notification row maps to a kind (job / enquiry / booking / call, else
"message") and calls `emitLiveEvent`. Admins also push `job_offer_messages`
into the same toast (lines 649-683). It sits mid-screen after the recent
`top: 50%` change, which is why the overlap now looks broken.

**Why you see two:** a new message writes a message row (fires MessageAlert)
and a matching `instructor_notifications` row (fires EventToast).

## The fix: one banner, one queue

Keep every notification type, but route them all through a single iOS-style
banner that reuses the navy `MessageAlert` look.

1. **Single component.** Promote the MessageAlert visual into one
   `NotificationBanner` — navy card, top of screen under the safe area,
   rounded 14, small uppercase "DSM · <type>" bar, avatar or tinted type icon,
   title + 2-line preview, dismiss X, swipe-up to dismiss, tap to deep link.
   Sender avatar for messages; the existing `EventToast` icon/tint set
   (job amber, enquiry blue, booking green, call red) for everything else.

2. **Single source of events.** Both subscriptions feed the same
   `emitLiveEvent` bus instead of rendering their own UI. Nothing is dropped:
   jobs, enquiries, bookings, calls, admin job-offer messages, pupil messages
   and instructor messages all still fire.

3. **Deduplicate.** The bus keeps a short-lived set of recently shown keys
   (e.g. `message:<threadId>:<messageId>` and a 4s window on
   `kind + url + text`). A message that arrives as both a chat row and a
   notification row shows once. Message notifications prefer the richer
   message-row payload (real sender name + avatar).

4. **Queue, don't stack.** One banner visible at a time, 5s each, later events
   queue behind it — the iOS behaviour. No two cards on screen ever.

5. **Position.** Always top, under the safe area. Revert the mid-screen
   `top: 50%` change.

6. **Suppression rules kept.** No banner while already viewing that thread /
   `/messages*`; background events still fall back to the native push path
   already in `emitLiveEvent`.

## Technical notes

- `src/components/dsm/EventToast.tsx` becomes the single controller: extend
  `LiveEventPayload` with optional `title`, `avatarUrl`, `dedupeKey`, restyle
  the card to the navy MessageAlert design, add the queue and dedupe set.
- `src/components/dsm/MessageAlert.tsx` keeps its two realtime subscriptions
  but calls `emitLiveEvent` instead of rendering; or its subscriptions move
  into `__root.tsx` and the file is deleted. Either way only one component
  renders.
- `src/routes/__root.tsx`: keep both subscriptions, render one controller
  (line 757-758 collapses to a single `<NotificationBanner />`).
- No database or RLS changes; no change to what generates notifications.

## Open question

The duplicate `instructor_notifications` row for chat messages appears to come
from a Supabase-side trigger (nothing in `db/` creates it). Dedupe in the app
handles it either way, so this is not a blocker — but if you'd rather stop the
duplicate at the source I can check the trigger and drop it instead.
