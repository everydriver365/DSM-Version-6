# Fix: side menu doesn't fit on a phone screen

## What's wrong

The slide-out menu is a fixed full-height panel with no scrolling. Since the shortcut tiles (now 15) and the extra Settings / Calendar sync / Help / Upgrade / Sign out rows were added, the content is taller than a phone screen, so the bottom items get cut off and can't be reached.

## The fix

In `src/routes/__root.tsx` (menu panel only):

- Let the panel scroll: the profile header stays pinned at the top, everything below it scrolls vertically with smooth touch scrolling, and the bottom padding keeps clear of the phone's home indicator.
- Use the dynamic screen height so mobile browser chrome doesn't push content off-screen.
- Tighten the shortcut grid slightly (smaller tile padding and gaps) so more fits before scrolling is needed.

No changes to what the menu links to or to any other page.

## Check afterwards

Open the menu on a small phone viewport and confirm every item, including Sign out at the bottom, is reachable by scrolling.
