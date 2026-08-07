Convert the "More" page grouped tools grid into single-column rows.

Scope: only src/routes/more.tsx, only the grouped tool grid block (not the search results flat list, not the Learn card, not the TOOLS array, not navigation).

What will change:
1. Replace the `display: grid` container with a `display: flex; flexDirection: column` container, keeping the same 16px side margins and using 7px row gap.
2. Convert each tool tile `<button>` from a vertical column to a horizontal row:
   - Row style: white background, 13px border radius, 10px 13px padding, flex center aligned, 11px gap, subtle shadow, 0.5px border, full width, left-aligned text.
   - Icon container: 34x34px, 9px border radius, background color from tool.colour at 15% opacity, icon sized 18px.
   - Text block: label and sub stacked vertically in a single `<div>` next to the icon. Label: 12.5px, weight 600, #0F2044. Sub: 10.5px, #9CA3AF, 1px top margin.
   - Add a right-aligned `<ChevronRight size={16} color="#C7CEDA" />` as the trailing element.
3. Ensure ChevronRight is already imported in the file (it is already present in the import list).

No changes to: allTools data, group ordering, route navigation, search bar, Learn card, or desktop-specific branches.