# Redesign the PRO page to match the mock

Rebuild `/pro` (the second screen of the HOME ↔ PRO swipe) as a light, card-based hub matching the reference: a light header, a "Recommended for you" carousel, a 3-column PRO HUB grid, and a "What's New" list. All work stays in `src/routes/pro.tsx`.

## New layout, top to bottom

1. **Header (light, not navy)**
   - "PRO" wordmark in brand blue, bold.
   - Subtitle: "Your professional hub / Learn. Grow. Succeed."
   - Search and bell icons top-right. Search opens the existing universal search; bell goes to notifications.
   - The existing TODAY / PRO pill toggle from the home swipe stays where it is and keeps working — it just sits under the header on this screen.

2. **RECOMMENDED FOR YOU** — section label with "See all", then a horizontally scrollable, snapping row of cards:
   - Video card: thumbnail, NEW badge, play button, duration chip, title, "Pro TV · 8 min".
   - Continue-learning card: dark navy tile, course name, module, progress bar and percentage.

3. **PRO HUB** — 3-column grid of white tiles, each with a coloured icon, bold title and grey subtitle:
   - Pro Learn (Courses & CPD) → `/learn`
   - Pro TV (Videos & tutorials) → `/dsm-live`
   - Showcase (Tips & inspiration) → `/showcase`
   - Pro Radio (Listen on the go) → `/radio`
   - Pro Shop (Products & deals) → `/marketplace`
   - Resources (Downloads & tools) → `/resources`

4. **WHAT'S NEW** — section label with "See all", then a white card containing rows: small thumbnail, bold title, grey meta line, chevron. Each row navigates to its destination.

The current Radio / TV / Perks / Community / Shop stacked sections are replaced by the above. Perks and Community stay reachable from the global menu and the hub grid stays limited to the six tiles in the mock.

## Content and wiring

- The hub grid, headers and navigation are fully wired to existing routes.
- Recommended and What's New start from the existing content sources where they are already available on the client (learn videos / news); anything without a ready source renders as clearly-labelled placeholder content in the same layout, so it can be swapped for live data later without touching the design.

## Technical notes

- Only `src/routes/pro.tsx` changes. Page background `#F4F6F8`, cards white with `0.5px #E4E8EF` borders and 14px radius, Poppins, navy `#0B2341`, accent blue `#2C97DE`.
- Keeps the `PageLayout` wrapper and current component export so the home swipe container continues to embed it unchanged.
- Horizontal carousel uses CSS scroll-snap; touch handlers stop propagation so the carousel does not trigger the outer page swipe.
