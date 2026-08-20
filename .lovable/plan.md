# Apply the top-sheet layout to Schedule

Give `/schedule` the same look as Messages and Pupils: a navy header at the top, with a white rounded panel that sits over it and holds all the content.

## What changes

Only `src/routes/schedule.tsx`, and only the page chrome (outer container, header, scroll area). No changes to lesson tiles, gap rows, data loading, or any sheet.

1. Outer container background becomes navy `#0B1F3A` (currently the page background token).
2. Remove `InstructorTopBar` and its spacer; replace with the same custom navy header used on Pupils:
   - height `calc(max(env(safe-area-inset-top, 0px), 24px) + 86px)`, padding `calc(... + 13px) 22px 28px`
   - "Schedule" title in Sora 22/700 white
   - round translucent bell button (40px, `rgba(255,255,255,0.1)`) navigating to `/notifications`, with the red unread dot when `unreadCount > 0`
3. Wrap everything below the header (month strip, legend row, scroll list) in the white panel:
   - `marginTop: -18`, `background: #FFFFFF`, `borderRadius: 28px 28px 0 0`, `flex: 1`, `minHeight: 0`, `overflow: hidden`
   - the existing scroll container keeps `overflowY: auto` and its bottom safe-area padding, so scrolling behaviour and the scroll-driven month tracking stay intact
4. The month strip and legend stay pinned at the top of the white panel (they are outside the scroll area today, so they keep that position); the "Moving lesson" banner stays directly under the header.

## Notes

- The back / phone / live-track / mic actions currently provided by `InstructorTopBar` disappear, matching Messages and Pupils. Tell me if you want any of them kept as a second icon next to the bell.
- If the month strip has a light background of its own it may need to blend with white; that is a small style tweak inside the same file.
