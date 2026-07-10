## Problem

On a real mobile device the published `/home` renders zoomed-out: the "Go" button, notification badge, "Full schedule" link and the Today/Tomorrow/Next tabs are all clipped on the right. The viewport meta tag (`width=device-width, initial-scale=1`) is set correctly in `src/routes/__root.tsx`, so this is not a meta-tag issue.

The cause is horizontal overflow inside the page. When any descendant is wider than the device width, mobile Safari/Chrome expand the layout viewport to fit it, then shrink the whole page to display it — which is exactly what the screenshot shows. The home carousel panels are `width: 100vw`, so as soon as one child overflows, every panel visually overflows too.

## Investigation

Use Playwright against `http://localhost:8080/home` at a 390 px mobile viewport (with the Supabase session restored) to:

1. Take a screenshot at 390×844 to reproduce the clipping.
2. Query the DOM for elements whose `scrollWidth` / `getBoundingClientRect().right` exceeds `window.innerWidth`, walking down from `<body>`. This pinpoints the exact offending node(s) — likely candidates based on the screenshot:
   - The "Today's timeline" tab row (Today / Tomorrow / Next) — a flex row with no `overflow-x` wrapper.
   - The "Today's lessons" horizontal card carousel (partial next card is visible in the screenshot).
   - Any inline SVG / image / button with a fixed `width` larger than expected.
3. Confirm the outer `position: fixed; inset: 0` container in `src/routes/home.tsx` (line 3834) is actually rendering at 390 px and that its children are what's overflowing.

## Fix (scope: `src/routes/home.tsx` only, unless investigation shows otherwise)

Once the offender is identified, apply the minimum fix at that node:

- If it's a scroll row (tabs / card carousel): wrap in a container with `overflow-x: auto; scrollbar-width: none` and `max-width: 100%`, so the row scrolls inside its panel instead of pushing the document wider.
- If it's a flex row without `min-width: 0` on the text child: add `min-width: 0` and `truncate` so it can shrink.
- If it's a fixed-pixel element (button/badge) that exceeds 390 px on some layout: convert to `flex: 1 1 auto` with `min-width: 0`.

As a belt-and-braces safeguard on the home route only, add `overflow-x: hidden` to the outer `position: fixed` container's inner flex column so that even if a future child overflows, it clips instead of expanding the layout viewport.

## Verification

- Re-run Playwright at 390×844 and confirm no descendant has `right > 390`.
- Screenshot the Today panel and confirm the header icons, notification badge, and hero "Go" button all sit fully inside the viewport.
- Swipe through the other workspace panels (via the dot indicator) and re-check overflow on each.
- Confirm the bottom nav (restored in the previous turn) still shows.

## Out of scope

- No changes to navigation, data, badges, handlers, or the shared BottomNav.
- No changes to any file other than `src/routes/home.tsx`, unless investigation proves the overflow originates in shared CSS (`src/styles.css`); in that case I'll flag it before editing.
