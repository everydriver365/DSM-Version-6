# Fix duplicate message alerts and the slow messages badge

## What's happening

**Two alerts for one message.** A new pupil message creates one `instructor_notifications` row, but three separate places in the app react to it:

1. `src/routes/__root.tsx` subscribes to `instructor_notifications` inserts and fires the global event toast (`emitLiveEvent` → `EventToast`).
2. `src/routes/home.tsx` subscribes to the *same* table and shows its own slide-down banner.
3. `src/routes/home.tsx` also polls notifications every 30s and toasts new ones.

On the home screen 1 and 2 fire together, so you see two alerts.

**Badge on the messages tab lags.** In `src/components/dsm/BottomNav.tsx` the unread hook:

- Uses a fixed realtime channel name (`"unread-badge"`), and the effect re-runs on every route change. The cleanup is async (`cleanupPromise.then(...)`), so the *old* channel is torn down *after* the new one subscribes — same name, so the live subscription gets removed and the badge falls back to the 60-second polling interval. That matches "doesn't trigger for a while."
- Only listens to `chat_messages` INSERT and `conversations` UPDATE. It does not listen to `conversations` INSERT (first message from a pupil) or `local_chat_messages`, so those only appear on the next poll.
- Ignores the `dsm-message-received` event that other screens already broadcast when a message arrives.

## The fix

### 1. One alert per notification
Keep the global toast in `__root.tsx` as the single alert path. Remove home's duplicate realtime banner subscription, and make home's 30s poll only update the bell count (no toast) so it can't re-alert something already shown.

### 2. Instant badge updates
In `BottomNav.tsx`, rework the unread hook:

- Give the channel a unique, user-scoped name (e.g. `unread-badge-${uid}`) and make setup/teardown synchronous so a route change can't kill the live channel.
- Split the effect: subscribe once per user (not per route); keep a cheap refetch on route change.
- Subscribe to `chat_messages` INSERT, `conversations` INSERT and UPDATE, and `local_chat_messages` INSERT.
- Also refresh on the existing `dsm-message-received` window event.
- Keep the 60s interval as a safety net only.

## Notes

If the badge still lags after this, the remaining possibility is that `chat_messages` / `conversations` aren't in the Supabase realtime publication — that needs a database check rather than a code change, and I'll confirm it once the code path is clean.

## Files touched

- `src/routes/home.tsx` (remove duplicate notification banner + toast-on-poll)
- `src/components/dsm/BottomNav.tsx` (unread hook subscription rework)
