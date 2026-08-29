# Fix the grey gap under the top header

## What causes it (confirmed in code)

Two things reserve space for the same header:

1. `src/routes/__root.tsx` (line ~766): the header is `position: sticky; top: 0` with
   `marginTop: calc(-1 * env(safe-area-inset-top,0px))` and
   `paddingTop: calc(env(safe-area-inset-top,0px) + 12px)`.
   Because it is **sticky** (not fixed), it already occupies its own space in the page flow.
2. `src/routes/__root.tsx` (line ~958): the page wrapper *also* adds
   `paddingTop: calc(env(safe-area-inset-top,0px) + 46px)` — a spacer that was written for a
   fixed header.

So the page gets roughly an extra 46px + safe-area of empty wrapper padding below the header,
painted in the wrapper background `#EEF2F7` — the light grey strip in the screenshot, sitting
between the navy header and the navy "Nearest" hero block.

## Fix

- Remove the duplicate spacer: since the header is sticky, the wrapper should not add
  `paddingTop` when the header is shown (keep `paddingTop: env(safe-area-inset-top,0px)` only
  for the no-header case, and drop the extra 46px).
- Keep the header's own negative margin + safe-area padding so the navy still paints behind
  the iOS status bar.
- Leave the bottom-nav padding, backgrounds, and every other style untouched.

## Verification

Check `/nearest`, `/home`, and one `PageHeader` page (e.g. `/help`) at a mobile viewport:
the navy header should sit flush against the page content with no grey strip, and no content
should be hidden behind the status bar.

## Files touched

- `src/routes/__root.tsx` (wrapper spacer only)
