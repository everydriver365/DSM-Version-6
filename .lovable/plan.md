## Goal

Restyle the pupil list rows on `/pupils` to match the Google Calendar-style layout used on `/schedule` and `/pupils/$id`, while keeping all current functionality (tabs, search, FAB, navigation, loading skeletons, filtering).

Only `src/routes/pupils.index.tsx` will be modified.

## Kept as-is

- Sticky top bar (DSM + Pupils + search toggle)
- Search input (autofocus, query state)
- Active / Passed / Archived segmented control
- Supabase fetch + tab-driven filtering
- Loading skeleton rows
- "No pupils" empty state
- FAB linking to `/pupils/new`
- `<Link to="/pupils/$id" params={{ id }}>` navigation per row

## New row layout (per pupil)

Replace the current `<Card>` row with a flat Google Calendar-style row:

```text
[40px avatar] [3px accent bar] [name + status badge + £balance]  [N lessons]  [chevron]
```

- Avatar column: keep the existing 40px circular initials avatar (#1A52A0 bg, white text)
- Accent bar: 3px wide, full row height, rounded 2px
  - Active → `#1A52A0` (blue)
  - Passed → `#16A34A` (green)
  - Archived → `#9CA3AF` (grey)
- Content column:
  - Name: 14px, semibold, `#0F2044`, truncate
  - Sub-row: small status pill (existing `statusBadgeColor`) + `£X.XX` in red when `balance_owed > 0`
- Right column:
  - "N lessons" text 12px `#6B7280`
  - `ChevronRight` 14px `#9CA3AF`
- Row container: white bg, no card border/radius, padding `12px 16px`, full-bleed so dividers run edge-to-edge inside `px-0` list wrapper
- Hairline divider: `0.5px #F3F4F6` between rows, inset to start at the content (after avatar) like the schedule page

## List container

- Switch the list wrapper from `px-4 pt-4` + `gap-2` cards to a flat `flex flex-col` with no horizontal padding, so rows are full-bleed and dividers span properly. Keep `pt-2` spacing under the segmented control.
- Skeleton rows: update to match the new flat row geometry (avatar + bar + two text lines + right block), still inside `px-4` for visual parity during load — or full-bleed to match the loaded state. Will use full-bleed to match final state.

## Technical notes

- Add `ChevronRight` to the lucide-react import
- Add an `accentColor(status)` helper alongside existing `statusBadgeColor`
- No data shape changes, no new queries, no route changes
- Reuse existing `initials`, `POPPINS`, `statusBadgeColor`

## Files

- `src/routes/pupils.index.tsx` — row JSX + skeleton geometry + lucide import + small color helper
