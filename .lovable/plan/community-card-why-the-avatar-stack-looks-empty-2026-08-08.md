# Community card: why the avatar stack looks empty

## What's actually happening

The card currently shows "15 active" (Issues 10, Chat 4, Admin 1) but only a single small red warning circle where the avatar stack should be.

Checked the live page: exactly one avatar element renders, and it's the alert bubble. The avatar stack is built from only three sources:

- unread pupil messages — currently 0, so no pupil faces
- instructor DMs — only added when unread DMs > 0, currently 0
- local alerts — collapsed into **one** generic warning circle no matter how many alerts there are

Community chat activity (4 unread) and admin room activity (1 unread) contribute **no** avatars at all. So with the current data there is essentially nothing for the stack to draw.

## Proposed fix

In `src/routes/home.tsx`, Community card header only — widen what feeds the avatar stack so it reflects the actual activity:

1. Local alerts: one avatar per recent alert (up to 3) using the reporter's photo/initials when available, falling back to the warning circle, instead of a single generic bubble.
2. Community/local/UK chat: add avatars for the most recent chat posters (photo or initials, purple fallback colour).
3. Admin room: add an avatar for the admin room when it has unread activity (megaphone/brown circle).
4. Keep recent pupil-message and DM avatars as they are, but include recent pupils even when nothing is unread, so the stack isn't blank on a quiet day.
5. Keep the existing cap (8 visible + "+N") and the existing empty-state Users icon, which then only appears when there is genuinely no activity.

## Technical notes

- Single file: `src/routes/home.tsx`, inside the IIFE that builds `avatarSources` (~line 7627) and its render block (~line 7790).
- Reuse existing state already in scope: `localAlerts`, `localChatLatest`, `ukChatLatest`, `visibleRooms`, `dmPreviews`, `unreadMsgs`.
- No new queries unless a source lacks an author image/name; in that case fall back to initials or an icon rather than adding a fetch.
- Counts, labels, "Latest" row and navigation behaviour stay unchanged.
