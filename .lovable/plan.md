# Roll out the navy top-sheet design across the app

Apply the same look already used on Messages, Pupils, Schedule and More to the rest of the app's pages: a fixed navy header with the page title (plus a back arrow on sub-pages) and a notification bell, and a white rounded panel that overlaps the header and holds all scrolling content.

This is a visual change only. No data fetching, handlers, state, business logic, or navigation targets change.

## Shared component first

Right now the layout is hand-copied into four pages. First extract it once so every other page is a small, low-risk edit:

`src/components/dsm/DSMTopSheet.tsx`
- Props: `title`, optional `onBack` (renders a back chevron left of the title), optional `right` (custom header action; defaults to the notification bell with unread dot), optional `sticky` (content pinned under the panel's top edge, e.g. the Schedule month strip / filter pills), `children`.
- Renders: fixed full-screen navy (`#0B1F3A`) container, header sized with `max(env(safe-area-inset-top), 24px) + 86px`, Sora 22/700 white title, translucent round bell button, then the white panel (`borderRadius: 28px 28px 0 0`, `marginTop: -18`, scrollable, bottom padding `calc(88px + env(safe-area-inset-bottom))`).
- Pure layout; no hooks other than the unread-count read the current pages already do (kept as an optional prop so the component stays dumb).

Then convert Messages, Pupils, Schedule and More to use it so the four existing pages and all new ones stay pixel-identical.

## Rollout

93 routes currently render `InstructorTopBar`. Convert them in phases, verifying each phase in the preview before moving on:

1. Core daily pages: home, diary, todos, gaps, notifications, search, quickaccess, checklist, briefing, end-of-day/eod.
2. Pupils & lessons sub-pages: pupils.$id and its tabs, lessons.*, tests, testday, mock-tests, driving-test, upcoming-tests, waitlist/waitinglist. These get the back arrow variant.
3. Money: earnings, payments, invoices, expenses, mileage, fuel, tax, mtd, monthend, outstanding, quotes, take-payment, discount-codes, subscription.
4. Business & content: marketplace, courses, community, learn, news, dsm-live, live-news, perks, benefits, discover, resources, jobs, referrals, rewards.
5. Settings & admin: settings, profile, vehicle, availability, minisite, calendarsync, notificationsettings, plus the `admin.*` pages.

Excluded (different shells by design, unless you want them included): marketing pages (`_marketing.*`), auth pages (login/register/forgot/reset), public share pages (`i.$slug`, `quote.$token`, `terms_.sign`, `pay`, `payment-complete`, `marketplace_.$slug`), and the immersive `live.tsx` tracking screen.

## Per-page edit shape

For each page: remove `InstructorTopBar` and its spacer, wrap the existing returned content in `DSMTopSheet` with the page's existing title, keep every child element, prop and handler exactly as-is, and move only page-level background/padding styles onto the panel. Filter pills, search bars and segmented controls that sat on navy get the `#EEF2F7` background used on Messages/Pupils so they stay visible on white.

## Notes

- Some pages have sticky sub-headers (Schedule's month strip, tab bars). Those go through the `sticky` slot so they stay pinned inside the white panel.
- Pages with floating action buttons or sticky bottom bars keep them; bottom padding accounts for the nav bar and safe area.
- `capacitor.config.ts` is not touched.
