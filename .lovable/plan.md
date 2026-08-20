# Apply the Messages sheet design to the Pupils page

Give `/pupils` the same look as the Messages page: navy background, a simple navy header with the page title and a bell button, and a white rounded panel that overlaps the header and holds all the page content.

## What changes

1. **Header** — replace the current `InstructorTopBar` (back arrow, mic, phone, live-track, menu icons) plus its spacer with the Messages-style header: navy strip, safe-area top padding, "Pupils" title in Sora 22/700 white on the left, round translucent bell button on the right that goes to `/notifications`.

2. **Page frame** — make the page a fixed, full-height navy column (`position: fixed; inset: 0`, flex column, `overflow: hidden`) exactly as Messages does, so the header stays put and only the panel scrolls.

3. **White panel** — wrap the existing content (count + actions row, status filter tabs, search input, pupil list, and any empty states) in a scrollable white container with `borderRadius: 28px 28px 0 0`, `marginTop: -18` so it tucks under the header, `paddingTop: 12`, and bottom padding of `calc(88px + env(safe-area-inset-bottom, 0px))` to clear the nav bar.

4. **Filter tabs tint** — set the status-tab strip background to `#EEF2F7` (matching the Messages segmented control) since it now sits on white.

## Not changing

Pupil data loading, filtering, sorting, search behaviour, badges, cards, links, and every sheet/dialog on the page stay exactly as they are. Only `src/routes/pupils.index.tsx` is touched.

## Technical notes

- Reference implementation: `src/routes/messages.index.tsx` lines ~1096-1205 (page frame, header, scroll panel).
- Removing `InstructorTopBar` also removes the back/phone/live/menu shortcuts from this page — matching Messages. Say so if you want the bell-only header but the back arrow kept.
