# Fix the navy band above the chat header (and finish the Map Draw icons)

## 1. Finish the in-progress Map Draw work (build is currently broken)

The vehicle-icon change was mid-edit when the mode switched, and `src/routes/pro-teach_.map.tsx` now references `VEHICLE_TYPES` without importing it, which fails the build. First action on approval: add the import from the new `src/components/icons/VehicleIcons.tsx`, then complete the approved icon work — SVG vehicles in the toolbar pills, on the map overlay and in the exported image, plus the pointer-event placement fix.

## 2. The navy band at the top of the chat page

In the screenshot there is a navy strip roughly one header tall between the app header and the "Richard Chapman" chat header.

What the code shows today (verified):

- The global app header in `src/routes/__root.tsx` is `position: sticky` and includes `padding-top: env(safe-area-inset-top) + 16px`, so it occupies its own height in the page flow.
- The chat page in `src/routes/messages.$pupilId.tsx` wraps everything in `PageLayout` with `height: 100dvh`, and its own navy header is a second `position: sticky; top: 0` block.

Two full-viewport-height stacked blocks under a header that is itself in flow makes the page taller than the screen, so the body scrolls; both navy headers then pin independently and a navy band appears between them. The exact pixel source needs confirming on the running app before the fix is written.

Work:
1. Reproduce the thread screen headlessly at mobile width, signed in, and measure the top/height/padding of the app header, the chat header and the wrapper — confirm which element is producing the extra navy.
2. Fix the sizing so the chat screen fills exactly the space below the app header: the page column sized against the app header instead of a flat `100dvh`, the chat header in flow at the top of that column (no second sticky/safe-area offset), and no navy element other than the two headers themselves.
3. Re-measure after the change: app header immediately followed by the chat header, no navy gap, at 390px, 430px and desktop widths, and with the thread scrolled up and down.

## Technical notes

- Files touched: `src/routes/messages.$pupilId.tsx`, `src/routes/pro-teach_.map.tsx`, `src/components/icons/VehicleIcons.tsx` (new). `__root.tsx` only if measurement proves the extra space originates there.
- No change to message sending, realtime, search, jump-to-latest or auto-scroll behaviour.
