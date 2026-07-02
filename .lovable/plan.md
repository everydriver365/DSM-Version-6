## Why you see no changes

The previous restyles replaced specific hex codes (`#0C2340`, `#0A2540`, etc.), but the app's most visible surfaces are hardcoded with **different** navy hexes that were never on the replacement list:

- `#072b47` — the top header bar on every logged-in screen (`InstructorTopBar` + ~70 route files)
- `#1B2B4B` — secondary dark surfaces (66 occurrences)
- `#1A1A2E` — near-black text/surfaces (147 occurrences)
- `rgba(15, 32, 68, …)` — translucent navy overlays in inline styles

I confirmed the live preview is rendering `#072b47` in the header right now — so it's not a caching issue; those elements genuinely still have the old colors.

## Fix

Map every remaining legacy dark color to the Checkfront palette so the change is unmissable:

1. Replace `#072b47` / `#072B47` → Checkfront deep navy `#0B1F3A` everywhere (header bars, borders, gradients).
2. Replace `#1B2B4B` → `#0B1F3A` (or a slightly lighter Checkfront navy for hierarchy).
3. Replace `#1A1A2E` → `#0B1F3A` where used as a surface, and Checkfront text navy where used as text.
4. Replace lingering `rgba(15,32,68,…)` overlays with the `#0B1F3A` rgb equivalents.
5. Verify visually with an automated screenshot of `/home` before handing back, confirming the header renders `#0B1F3A` and accents render `#1877D6`.

Only color values change — no layout, functionality, or file structure changes.