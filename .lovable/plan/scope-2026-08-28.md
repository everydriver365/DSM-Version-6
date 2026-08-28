Redesign the Upcoming Tests dashboard tile

## Scope
Only the Upcoming Tests tile in `src/routes/home.tsx` (the existing card that shows the next booked driving test, countdown label, date badge and "View all" footer). Do not change any other dashboard tiles, sections, navigation or data logic.

## Current state
The tile is rendered inline in `src/routes/home.tsx` around the existing "Upcoming tests" section. It currently uses:
- A grey/taupe gradient background
- A red filled star icon and red countdown text
- A dark navy rounded date badge
- Black/grey pupil meta text
- A red chevron
- A white footer with stacked coloured avatars and a blue "View all" link

## Proposed redesign
Replace only the styling/layout of that single tile so it matches the reference image and the new brand palette:

1. **Card container**
   - Large rounded rectangle with `borderRadius: 22px` (within the 20–24px range)
   - Very subtle shadow: `boxShadow: '0 4px 16px rgba(7,43,71,0.10)'`
   - Background `#F7FAFC` on the outer card so the white footer blends seamlessly
   - `overflow: 'hidden'`

2. **Main gradient section**
   - Background: `linear-gradient(135deg, #072B47 0%, #0A6CFF 100%)` (dark navy → bright brand blue)
   - Padding: ~16–18px
   - All text/iconography in white

3. **Countdown label**
   - Small white star icon (`IconStar` filled white, no stroke)
   - Uppercase label: `"NEXT TEST IN ${daysUntilTest} DAYS"` (or "TODAY"/"TOMORROW" variants)
   - `fontSize: 11px`, `fontWeight: 600`, `letterSpacing: 0.3px`

4. **Date tile**
   - Prominent rounded tile, `borderRadius: 16px`
   - White background with navy text
   - Day number large (`fontSize: 22px`, `fontWeight: 700`)
   - Month short uppercase below (`fontSize: 10px`, `fontWeight: 600`)
   - Size roughly 54×54px

5. **Meta column**
   - Pupil name in white, `fontSize: 16px`, `fontWeight: 600`
   - Test centre line: white at ~70% opacity, `fontSize: 13px`
   - Date/time line: white at ~70% opacity, `fontSize: 13px`
   - Truncate with ellipsis to keep the card from breaking

6. **Chevron**
   - Clean white right chevron (`IconChevronRight` white)

7. **Bottom white footer**
   - White background, padding ~12–14px
   - Circular navy avatar (`#072B47`) containing the next pupil's initial, `width/height: 30px`
   - Text: `"${count} pupils with tests booked"` in `#6E6E73`, `fontSize: 13px`
   - Blue "View all" action (`#0066FF`), `fontSize: 13px`, `fontWeight: 600`, with a subtle right chevron

8. **Teal accent (subtle)**
   - Use a thin teal (#0A9CA6 or similar) top highlight only if it helps visual separation; otherwise keep it minimal per the reference.

## Behaviour to preserve
- The card remains tappable and navigates to `/tests`.
- The countdown label keeps its existing today/tomorrow/in-N-days logic.
- Date formatting, test-centre labelling and pupil-name cleanup stay the same.
- The footer still shows the total number of pupils with upcoming tests and the next pupil's initial.

## Files to change
- `src/routes/home.tsx` — restyle the existing Upcoming Tests tile block only.

## Out of scope
- No new routes, sheets, modals or data fetching.
- No changes to the `/tests` page, the alert strip, the upcoming-tests list panel or any other home page sections.
- No schema or backend changes.

## Acceptance criteria
- The Upcoming Tests tile renders with the navy→blue gradient, white type, white star, white date tile, white chevron and white footer described above.
- It matches the reference image's clean iOS dashboard card aesthetic.
- Surrounding dashboard tiles and layout remain unchanged.
- Build and typecheck pass.
