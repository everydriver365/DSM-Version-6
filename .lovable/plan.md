# Why the Local issues counters and pupil tag don't update

I traced both symptoms to the home screen's refresh wiring rather than the tile UI itself.

## Cause 1 — the realtime listener keeps tearing itself down

The effect that subscribes to realtime (`src/routes/home.tsx`, the `home-messages-${userId}` channel) reads badge preferences, calls `setBadgePrefs(...)` inside itself, and lists `badgePrefs` in its dependency array. `readBadgePrefs` returns a brand new object every call once preferences have been saved to localStorage, so the state update always looks like a change: the effect re-runs, removes the channel, subscribes again, sets state again, and repeats. A channel that is constantly re-subscribing never settles long enough to deliver inserts, so nothing ever bumps `reloadKey` and the counters stay frozen until a manual reload. The window `focus` handler has the same problem — it writes a fresh object each time and forces another resubscribe.

## Cause 2 — the pupil unread query doesn't run as the signed-in user

The effect that fills `unreadMsgs` (which drives the pupil tag/avatar and the SMS/in-app counts) does a hand-rolled `fetch` to the REST endpoint with the anon key in both `apikey` and `Authorization`. That request is evaluated as the anonymous role, not the signed-in instructor, so row-level security on `chat_messages` decides what comes back regardless of the session. Every other read on this page goes through the `supabase` client with the user's session. This is the most likely reason a newly received pupil message never changes the tag.

## Secondary issue

`unreadUkChat` is only ever assigned when both a subscription row and a latest message exist; there is no `else` that resets it to `0`. Once it goes to 1 it can stay stuck.

## Fix

Only `src/routes/home.tsx` (plus, if needed, `src/lib/badgePrefs.ts`) changes.

1. Stop the resubscribe loop: remove `badgePrefs` from the realtime effect's dependency array and read preferences from a ref/state that is set outside the effect, or make `readBadgePrefs` return a stable value (compare and reuse the previous object when the contents are equal). Depend on the three boolean flags, not the object identity.
2. Make the focus handler only call `setBadgePrefs` when the flags actually differ.
3. Replace the raw `fetch` for unread pupil messages with the `supabase` client query (`from('chat_messages').select(...).eq('instructor_id', userId).eq('sender_type','pupil').is('read_at', null).is('deleted_at', null).order('created_at', { ascending: false }).limit(10)`) so it runs with the user's session and RLS sees the instructor.
4. Always set `unreadUkChat` — including `0` when there is no unread message or no subscription row.

## Verification

After the change: confirm in the browser console that the channel subscribes once (not repeatedly), then insert/receive a pupil message and check that the pupil tag and the Local issues counters update without a reload.
