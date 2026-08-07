# Community tile avatar stack — show up to 8 avatars

## Goal
Increase the community tile avatar stack on the home page so it displays up to 8 source avatars instead of the current 6, while keeping the overflow counter for any remaining sources.

## Current state
- The community tile avatar stack is built from three sources: unread pupil messages, unread instructor DM previews, and an alert indicator.
- It is currently capped at 6 visible avatars (`avatarSources.slice(0, 6)`); anything beyond that shows as `+N`.
- Only one avatar showing indicates there is only one active source item at that moment (data-driven), not a code bug. Raising the cap to 8 will not create extra avatars where there are no sources, but it will display more of them when activity is higher.

## Changes
- In `src/routes/home.tsx`, inside the community tile render block (~line 7646-7647):
  - Change `avatarSources.slice(0, 6)` to `avatarSources.slice(0, 8)`.
  - Change the overflow count calculation from `avatarSources.length > 6 ? avatarSources.length - 6 : 0` to `avatarSources.length > 8 ? avatarSources.length - 8 : 0`.
- No visual styling changes needed; the existing 28px avatars, `-8px` overlap, and `+N` overflow pill remain the same.

## Out of scope
- Other avatar stacks elsewhere in the app (e.g. lines 686 and 7549) still cap at 6 unless you ask to change them too.
- The underlying data sources (unread messages, DMs, alerts) are not modified.
