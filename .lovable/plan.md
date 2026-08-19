# Live Track page — what actually changed

## What I checked

I compared the current `src/routes/live.tsx` against the version that existed before my last two turns.

The only changes I made were:

1. The top header block (height 52 -> min-height 56, safe-area top padding + 10px, bottom padding 10px).
2. Re-adding `/live` to the no-bottom-nav list in `src/routes/__root.tsx` so the tracking page is full-screen again.

The bottom tracking panel markup (the white card with "TRACKING / pupil name" and the grey mi / duration chip) has **not** been edited in either of those turns. Its last content change was on 29 July, long before this session. So I did not change the bottom half — nothing of mine needs reverting there.

The tall empty white area in your screenshot comes from the panel itself: when tracking, it renders only the one row plus its padding, and the panel is anchored full-width to the bottom of the screen. The dark round button over it is the native/iOS overlay you said to ignore.

## Options

Since the panel is at its historical state, the question is what "how it was" means:

- Option A — leave it exactly as is (no code change). Recommended if the layout is fine and only the floating button bothered you.
- Option B — if the panel used to be shorter / show more (e.g. speed, road name, overspeed count under the pupil row), tell me which elements you remember and I will restore or rebuild that row inside the same panel.
- Option C — a specific earlier version: if you can point at a chat message or history entry where the panel looked right, I will diff that exact version of `live.tsx` and restore only the bottom panel block from it.

## Technical notes

- Bottom panel: `src/routes/live.tsx`, the `{/* BOTTOM PANEL */}` block (~line 1762) — absolutely positioned, `borderRadius: 8px 8px 0 0`, `padding: 10px 20px`, `paddingBottom: calc(20px + safe-area)`.
- Any restore would be scoped to that block only; the map, polyline, and tracking logic stay untouched.
