# Make every page's header spacing match Messages

The Messages screen has its own hand-built header, while ~98 other pages use the shared `DSMTopSheet` component. The two use different numbers, so More (and everything else) looks slightly off: smaller title padding, tighter side margins, a smaller bell button, and an extra grey drag handle that Messages doesn't have.

## The fix

Change the shared `DSMTopSheet` component once so it matches the Messages layout exactly. Every page built on it (More, Pupils, Schedule, Settings, all sub-pages) picks up the correct spacing automatically — no page-by-page edits.

## What changes in DSMTopSheet

| Item | Now | Becomes (Messages spec) |
| --- | --- | --- |
| Header height | implicit | `calc(max(safe-area-top, 24px) + 86px)`, fixed |
| Header padding | `max(safe,24px)` top / 20px sides / 20px bottom | `calc(max(safe,24px) + 13px)` top / 22px sides / 28px bottom |
| Header alignment | centred | items aligned to top (`flex-start`) |
| Title | Poppins 22px / 28px line | Sora 22px / 40px line, weight 700 |
| Bell button | 36px circle, `rgba(255,255,255,0.15)` | 40px circle, `rgba(255,255,255,0.1)` |
| Back button | 36px circle | 40px circle, same treatment as bell |
| White sheet | `marginTop: -18`, drag handle, no top padding | `marginTop: -18`, no drag handle, `paddingTop: 12` |

Bottom padding for the nav bar (`88px + safe-area-bottom`) stays as-is.

## Notes

- The drag handle is removed because Messages does not have one; this is the visual difference most visible in the two screenshots.
- Messages itself is left untouched — it is the reference.
- No business logic, data fetching, or route changes.

## Files

- `src/components/dsm/DSMTopSheet.tsx` (only file edited)
