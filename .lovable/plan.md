# Back arrow on every page

Goal: every screen (except the main tab screens and signed-out screens) shows a back arrow like the one on Lesson Series, and it returns to the previous screen.

## Current state

- Two shared headers already draw the round back chip: `DSMTopSheet` (used by ~97 routes, the style in your screenshot) and `PageHeader` (8 routes).
- Around 56 route files render no shared header at all, so they have no back arrow — e.g. Radio, Nearest, Satnav, Schedule detail screens, Marketplace pages, Quotes, Rewards, Bitesize, Certifications, Coverage areas, Learn, Live, Take payment, Admin sub-pages, Pupils new/edit, Messages threads.
- `DSMTopSheet` already uses the safe `useGoBack()` hook (router history, with a fallback route). `PageHeader` still navigates to a fixed `backTo`/`/home` instead of going back.

## Approach

Rather than editing 56 files by hand with inconsistent results, add one global back control and let pages opt out when they already have one.

1. **Shared back context**
   - New tiny context provider in the root layout. `DSMTopSheet` and `PageHeader` register "this page already renders a back arrow" while mounted.

2. **Global back chip in `__root.tsx`**
   - Rendered directly under the navy app header, matching the screenshot chip: 40px circle, `rgba(255,255,255,0.1)` on navy, chevron-left, haptic tap.
   - Shown only when: no page-level back arrow is registered, and the current route is not in the exclusion list.
   - Exclusions: `/home`, `/schedule`, `/pupils`, `/messages`, `/more`, plus signed-out routes (`/`, `/login`, `/register`, `/forgotpassword`, `/resetpassword`, `/onboarding`) and public pupil-facing links (`/i/$slug`, `/quote/$token`, `/pay`, `/terms/sign/$pupilId`).

3. **Make back always mean "previous page"**
   - `PageHeader` switches to `useGoBack()` with `backTo` used only as the fallback when there is no history (deep link, refresh, app cold start).
   - `DSMTopSheet` keeps its current behaviour; the handful of routes that pass a hard-coded `onBack` keep working.

## Technical notes

- Files touched: `src/routes/__root.tsx`, `src/components/dsm/PageHeader.tsx`, `src/components/dsm/DSMTopSheet.tsx`, plus one new `src/components/dsm/BackBarContext.tsx`.
- No route files need editing, no data fetching or navigation logic changes beyond the back handler.
- Registration uses a mount effect with a counter so nested sheets don't double-hide the global chip.
