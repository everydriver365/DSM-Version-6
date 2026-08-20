# Match Messages to the supplied Schedule reference

## Scope
- Change only `src/routes/messages.index.tsx`.
- Preserve all message loading, filtering, search, compose, navigation, and conversation behavior.

## Visual changes
1. Replace the current subpage-style header treatment with the reference structure: a navy page header, left-aligned **Messages** title, and the notification action on the right, without the back/menu controls that make the current screen look unlike the supplied image.
2. Rebuild the inbox wrapper as a fixed white top-sheet panel that overlaps the lower edge of the navy header, with the same large rounded top corners and page-height behavior shown in the reference.
3. Remove the drag-handle/modal appearance from this page and keep the filter/search controls inside the top of the white panel.
4. Keep the existing grey filter track and search styling, but align its spacing and width to the reference panel rather than the current floating-sheet layout.
5. Ensure the message list/empty state scrolls within the panel and remains clear of the bottom navigation and safe area.

## Verification
- Compare `/messages` at the current 393 × 718 viewport against the supplied reference.
- Confirm the header, panel overlap, rounded corners, content spacing, and bottom-nav clearance visually.
- Confirm filter, search, compose, and notification controls still work.
