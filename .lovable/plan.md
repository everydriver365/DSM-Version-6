# Turn chat message alerts back on

Right now direct chat messages only alert if a separate notification row happens to be written. The listener that watches messages in real time exists but isn't connected, so most incoming messages arrive silently.

## What changes

1. **Reconnect the message listener** so every new pupil chat message and every new instructor-to-instructor message fires the alert banner immediately.
2. **Stop suppressing alerts on the messages screen** — you'll get the banner even while sitting in the inbox or in a thread.
3. **Keep only true duplicate collapsing** — if the exact same message arrives twice (once as a chat row, once as a notification row) it still shows once. Two different messages, even in the same thread and seconds apart, both show.
4. **Queue instead of drop** — if several messages land at once they display one after another rather than overwriting each other.

## Technical notes

- Mount `MessageAlert` in `src/routes/__root.tsx` alongside `EventToastController` (it renders nothing; it only subscribes).
- In `src/components/dsm/MessageAlert.tsx`: remove the `pathRef.current.startsWith("/messages")` early return in `push`.
- In `src/components/dsm/EventToast.tsx` `isDuplicate()`: drop the broad thread-level keys (`msgthread:<id>` and the `msgthread:any` fallback that suppresses any generic `/messages` notification when a thread alert was recently shown). Keep dedupe on explicit `dedupeKey` plus the exact `kind|url|text` signature so the same message from two channels still collapses.
- Confirm the existing banner queue drains sequentially so back-to-back messages aren't lost.

## Files touched

- `src/routes/__root.tsx`
- `src/components/dsm/MessageAlert.tsx`
- `src/components/dsm/EventToast.tsx`
