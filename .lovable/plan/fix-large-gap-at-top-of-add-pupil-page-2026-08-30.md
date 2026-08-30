# Fix large gap at top of Add pupil page

## What's wrong
The Add pupil screen adds its own top spacing on top of the spacing the global app header already provides, so a tall empty band sits between the navy header and the "Add pupil" title.

Confirmed in `src/routes/pupils.new.tsx`: the page wrapper sets
`paddingTop: calc(env(safe-area-inset-top, 0px) + 16px)` and then the inner
container adds `pt-6`. The status-bar safe area is already handled by the
global header in `src/routes/__root.tsx`, so it is being counted twice.

## Change
- In `src/routes/pupils.new.tsx` only:
  - Remove the `paddingTop: calc(env(safe-area-inset-top, 0px) + 16px)` from the `PageLayout` style (keep the font style).
  - Keep the inner `px-4 pt-6` as the single, normal top spacing so the title sits close under the header, matching other pages.

No other files touched. No changes to form fields, validation, saving, or navigation.
