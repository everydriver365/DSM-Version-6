# Why some chat rooms are missing from search

## What the code currently does

The room browser search in `src/routes/messages.index.tsx` is fed by `allPublicRooms`, which is built by three filters applied before you ever type anything:

1. The query excludes any room whose outcode is `UK` (`.neq("outcode", "UK")`), so the national room can never be found.
2. `allPublicRooms` drops every room with `is_opt_in = true` (private/invite-only), including private rooms you have already joined — so a joined private room is unsearchable.
3. Inside the browser, the "Available" list additionally removes rooms you've joined and any room matching your home outcode. Those only appear under "Your rooms", and if that section is collapsed/short they read as "missing".

Also, matching is substring-only against `area_name` and `outcode`, so a room's `description` is never searched, and an outcode typed with a space or lowercase still matches (that part is fine), but partial city names that only exist in the description do not.

## Proposed fix

- Feed the browser a merged list: all public rooms + private rooms you have joined + the national (`UK`) room, deduped by id (the existing `browseRooms` memo already does most of this — use it instead of `allPublicRooms`).
- In `RoomBrowser`, keep the two sections but make the search itself global: when a search term is present, show every match in one flat "Results" list rather than splitting into mine/available, so nothing can fall out between the two buckets.
- Mark rows in results with their state: "Joined" / "Private" / "Join" button, so behaviour is obvious.
- Extend match to also test `description`.
- Keep invite-only rooms you have NOT joined hidden.

## Technical notes

Single file: `src/routes/messages.index.tsx`.
- Change the `RoomBrowser` `rooms` prop from `allPublicRooms` to `browseRooms`.
- Remove the `.neq("outcode", "UK")` filter from the browser's source query (or add the national room explicitly).
- Update the `useMemo` in `RoomBrowser` to return `{ results }` when `q` is non-empty and `{ mine, available }` otherwise, and render accordingly.
