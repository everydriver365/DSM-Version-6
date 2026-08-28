# Community Tile Visual Polish

## Goal
Apply a premium iOS/SaaS visual polish to the existing **Community tile** on the home page without changing any functionality, content, labels, icons, links, or interactions.

## Scope
- **Only file:** `src/routes/home.tsx`
- **Only section:** the Community tile rendered inside the home dashboard (the white card containing latest activity, avatar stack, status labels, and the expandable rows).
- No structural changes: keep the same collapse/expand behaviour, the same `Label`/`Sep` controls, the same navigation targets, the same data queries, and the same avatar sources/counts.

## Visual improvements

1. **Card shell**
   - Keep white background and light page background.
   - Increase corner radius slightly (e.g. 12px) for a softer, more iOS-native feel.
   - Replace the current shadow with a very subtle, layered depth shadow using existing DSM navy at low opacity.
   - Refine the border to a cleaner 0.5px hairline using the existing `BORDER_C` / `tokens.border` palette.

2. **Typography hierarchy**
   - Section title and "View All" link: keep text, but tighten letter-spacing and ensure weight contrast matches other dashboard sections.
   - Latest-activity title: keep bold, slightly refine size/line-height so it sits clearly above the source/detail line.
   - Source/detail line: use the existing secondary text colour at a slightly lighter weight to improve readability.
   - "Updated" timestamp and "active" count: reduce visual noise by using the muted text colour consistently.

3. **Spacing and alignment**
   - Increase internal card padding slightly (from 12px/14px to a consistent 16px).
   - Add more breathing room between the latest-activity row, avatar stack row, and label row.
   - Align the chevron and timestamp to a common baseline.

4. **Avatar stack**
   - Keep the same 4-avatar max and `+N` overflow count.
   - Increase avatar size slightly (e.g. 32px) and use a cleaner white border.
   - Add a faint shadow under each avatar so the overlap reads as depth, not a flat cut.
   - Ensure placeholder initials use consistent sizing and the fallback icon avatar uses the premium blue tint.

5. **Status / count labels**
   - Keep the existing `Issues`, `Chat`, `Pupils`, `Admin`, `EDP` labels and colours.
   - Refine the count pill shape, padding, and typography so the numbers feel like refined badges rather than inline text.
   - Use the existing brand colours (`RED_C`, `#7C3AED`, `#1877D6`, `#B45309`, `#0F766E`) unchanged.

6. **Divider**
   - Replace the current 0.5px `#E4E8EF` divider under the latest-activity row with a cleaner hairline that uses existing border tokens and has slightly more vertical margin.

7. **Expanded rows**
   - Keep all expanded row content identical.
   - Polish row padding, icon-circle sizing, and badge positioning so the expanded list feels like a continuation of the card rather than a separate block.

## Out of scope
- No new components, hooks, or routes.
- No changes to data fetching, state, navigation, or interactions.
- No changes to other dashboard tiles, the marketing site, login, or Capacitor config.

## Success criteria
- The Community tile visually matches a cleaner, premium iOS/SaaS aesthetic.
- All text, icons, counts, links, avatars, and expand/collapse behaviour remain identical.
- Build passes and the home page renders without layout shifts or functional regressions.
