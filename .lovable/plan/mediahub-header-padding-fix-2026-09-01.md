# MediaHub header padding fix

## Goal
Stop the MEDIA page header from being obscured by the fixed TODAY | PRO | MEDIA pill selector on the home swipe layout.

## What will change
Only `src/components/media/MediaHub.tsx`.

1. Locate the navy `MediaHub` header block (the sticky header containing the "MEDIA" title and NEWS | PRO TV | PODCASTS tabs).
2. Change its top padding so the header content starts below the fixed pill selector.
   - From: `paddingTop: env(safe-area-inset-top)`
   - To: `paddingTop: calc(env(safe-area-inset-top) + 44px)`
3. Keep all other styling, layout, data fetching, tab logic, and child components unchanged.
4. If the rendered pill selector height is materially different from 44px, use the measured height instead.

## Out of scope
- `src/routes/home.tsx` will not be modified unless inspection shows the pill selector itself needs adjustment.
- `capacitor.config.ts` will not be touched.
- No functional changes to tabs, navigation, or data sources.
