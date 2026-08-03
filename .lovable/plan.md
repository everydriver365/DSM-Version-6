# Fix: room search shows no rooms

## What's happening

In Messages → Local, the room picker exists (search box, dropdown, list), but the list it draws from is filtered down to almost nothing.

In `src/routes/messages.index.tsx` the room list is built as:

- fetch all rooms except the `UK` room
- fetch the rows in `chat_room_subscriptions` for the current user
- keep only rooms where there is a subscription row, or the room's outcode equals the instructor's home outcode

Two things make that list come back empty or one-item:

1. If the instructor has no subscription rows, only the home-outcode room qualifies — and if the picker was opened expecting "all rooms", it looks broken.
2. The home outcode is derived with `home_postcode.substring(0, 4)`, which produces things like `SO30` for `SO30 2XX` but `SO3` + a space for 3-character outcodes, so the equality match against stored outcodes can fail and drop even that one room.

Note: I could not query the database in this mode, so the exact row counts are unverified — the code path above is what limits the list regardless.

## The fix

Change the picker from "joined rooms only" to a full room browser with the joined rooms surfaced first:

- Load all local rooms (excluding the UK room), and separately the user's subscription ids.
- Show two groups in the dropdown: **Your rooms** (subscribed, or the home-outcode room) and **All rooms** (everything else). Hide invite-only/private rooms the user hasn't joined, matching the Community screen's behaviour.
- Search filters across both groups by area name and outcode.
- Selecting a room the user hasn't joined still opens it (read/switch), same as tapping a room in Community.

Also normalise the outcode derivation (strip the inward part properly rather than a fixed 4-character slice) so the home room reliably matches.

## Technical notes

- Single file: `src/routes/messages.index.tsx`.
- Change the loader effect that calls `setMyRooms` to store all rooms plus a `Set` of joined ids; pass both into `LocalChatView`.
- `filteredRooms` becomes two memos (joined / other) driven by the same `roomSearch` string.
- No schema or backend changes.
