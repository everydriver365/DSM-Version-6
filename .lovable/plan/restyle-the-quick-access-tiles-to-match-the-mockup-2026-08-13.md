# Restyle the Quick Access tiles to match the mockup

Visual-only change to the Quick Access section on the home page. Same tiles, same order, same routes, same paging, same search — only the look changes.

## What changes

Header row (already close to the mockup, refined):
- Blue vertical accent bar + "QUICK ACCESS" in uppercase blue, letter-spaced.
- Page pill on the right: white rounded pill with a stretched active dash, grey dots for the other pages, and "1/6" style counter.
- Circular white search button beside the pill.

Cards:
- White card, larger corner radius (~20px), soft shadow, more internal padding so cards are taller.
- Icon chip becomes a soft pastel tinted square (~52px, radius 16) with the icon drawn in the matching saturated colour — instead of today's solid colour chip with a white icon. Tint is derived from each tile's existing colour (e.g. blue tile -> pale blue chip + blue icon, red -> pale red chip + red icon, navy -> pale lavender chip + navy icon).
- Title: bold navy, larger (~19px), sits below the chip.
- Subtitle: small grey caption line under the title (e.g. Schedule -> "View diary", Pupils -> "7 active", Courses -> "List your courses").
- Two columns, 14px gap, same horizontal swipe pages of 6.

Footer:
- Centred grey "← swipe for more →" line under the grid, replacing/complementing the current indicator.

## Subtitles

The current tile list has no subtitle field. I'll add a short `sub` string to each entry in `quickAccessTiles` in `src/routes/home.tsx` — static descriptive text, plus the live pupil count for the Pupils tile since that value is already loaded on the page. Nothing else about the tile data changes.

## Technical notes

- Single file: `src/routes/home.tsx`, Quick Access block only (tile array gets a `sub` field; `renderHomeTile` restyled; header/footer markup updated).
- Colour tint via a small map from the existing `bg` hex to a `{ chip, icon }` pair, kept local to the section.
- No route, navigation, paging, or search logic changes.
