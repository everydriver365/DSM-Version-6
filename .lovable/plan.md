
Only `src/routes/home.tsx` is touched.

## Change 1 — Tools workspace (lines ~7135–7254)

Rebuild the tool catalogue and search behaviour to match the spec:

- Replace `searchQuery`/`setSearchQuery` usage inside this section with a new local piece of state `toolSearch` / `setToolSearch` (added near the top of the component with the other `useState`s). Existing `searchQuery` stays untouched since it belongs to another surface — this keeps the change scoped.
- Restyle the search bar to the spec: white bg, `border: 0.5px solid #E2E6ED`, `borderRadius: 14`, `padding: '12px 16px'`, `margin: '16px 16px 4px'`, flex row with `gap: 8`, `boxShadow: '0 2px 8px rgba(15,32,68,0.04)'`. Left `<Search size={16} color="#9CA3AF" />`. Input: `flex: 1`, no border, no outline, `fontSize: 13`, Poppins, `color: '#0F2044'`, transparent bg, placeholder "Search tools…". When `toolSearch` is non‑empty, render an `<X size={14} color="#9CA3AF" />` button that clears it (replaces the existing "Clear" text button).
- Replace the current `groups` array with the full `allTools` array from the spec (Teaching / Business / Admin / Reports, each tile has `label`, `sub`, `route`, `icon` component reference, `colour`, `group`). Use the Lucide icons named in the spec: `BookOpen, RefreshCw, Clock, Award, ArrowLeftRight, GraduationCap, ClipboardCheck, FileText, Receipt, Fuel, Car, MapPin, ClipboardList, AlertTriangle, Zap, FileCheck, Calendar, Gift, BarChart3, Calculator, Moon, TrendingUp, Activity, Settings` — verify each already imported at the top of the file and add any missing ones to the existing `lucide-react` import line.
- `filteredTools`: match `toolSearch` (trimmed, lowercased) against `label`, `sub`, or `group`.
- Rendering:
  - When `toolSearch` is empty: iterate the four groups in order (Teaching, Business, Admin, Reports); each group renders the existing uppercase heading style plus a 3‑column grid (`gridTemplateColumns: 'repeat(3, 1fr)'`, `gap: 8`, `mx: 16`, `mt: 20`) of the new premium tiles.
  - When `toolSearch` has value: render a single flat 3‑column grid of `filteredTools` with no group headers. If empty, show `No tools found for "{toolSearch}"` — muted, centered, 13px.
- Tile presentation: a new inline `<button>` (not `AccessTile`, which is white icon on solid bg) matching the spec — white bg, `borderRadius: 16`, `padding: '12px 10px'`, `border: '0.5px solid #F0F0F0'`, `boxShadow: '0 2px 8px rgba(15,32,68,0.04)'`, `minHeight: 80`, flex column, items flex‑start, cursor pointer. Icon chip: `40×40`, `borderRadius: 12`, background = `${colour}15` (colour + `15` = ~8% alpha hex suffix), centered, `mb: 6`, contains `<Icon size={20} color={colour} />`. Label: 12px, weight 600, `#0F2044`. Sub: 10px, `#9CA3AF`, `mt: 1`, single line with `overflow: hidden`, `textOverflow: ellipsis`, `whiteSpace: nowrap`. `onClick` calls `navigate({ to: tile.route as never })`.

## Change 2 — Today workspace quick access (lines ~5264–5310)

Replace the current `<QuickActionsGrid pages={…} />` block with a self‑contained swipeable 3×2 grid built inline in the "5. QUICK ACTIONS" section.

- Add new state at the top of the component: `const [quickPage, setQuickPage] = useState(0);` and a `qaStartX = useRef(0)`.
- Build `quickTiles` array as specified — 12 entries — using existing live counters that are already in scope: `freeSlotCount`, `upcomingLessons?.length`, `activePupilsCount`, `outstanding`, `unreadMsgs.length` (already an array in this file; use `.length` for the count check). Icons: `Zap, Calendar, Users, PoundSterling, MessageSquare, Clock, BookOpen, Award, Receipt, BarChart3, Award, Grid` from `lucide-react` (add any missing to the import line).
- Compute `tilesPerPage = 6`, `totalPages = Math.ceil(quickTiles.length / tilesPerPage)`, `currentTiles = quickTiles.slice(quickPage * 6, (quickPage + 1) * 6)`.
- Wrapper `<div style={{ margin: '16px 16px 0' }}>`:
  1. Header row: flex, `justifyContent: 'space-between'`, `alignItems: 'center'`, `mb: 10`. Left: "Quick access" — 10px, uppercase, `letterSpacing: 0.15em`, `#9CA3AF`, weight 600. Right: paging dots — one per `totalPages`; active dot `width: 16, background: '#0F2044'`, inactive `width: 5, background: '#E5E7EB'`; both `height: 5, borderRadius: 3`, `transition: 'all 0.2s ease'`, click sets `quickPage`.
  2. Gesture wrapper `<div onTouchStart={…} onTouchEnd={…}>` with the swipe threshold logic from the spec (dx > 50 → next, dx < -50 → prev, clamped to `[0, totalPages-1]`).
  3. Inside gesture wrapper: `display: 'grid'`, `gridTemplateColumns: 'repeat(3, 1fr)'`, `gap: 8`. For each tile in `currentTiles`, render the same premium tile button style described in Change 1 (white bg, colour chip = `${tile.colour}15`, icon in tile.colour, label + sub). `onClick`: if `tile.route === null` call `scrollToWs(7)` (Tools workspace); else `navigate({ to: tile.route as never })`.
- Remove the old inline `pages: QaTile[][]` block and the `<QuickActionsGrid pages={pages} />` call for this section. Leave the `QuickActionsGrid` component definition and `QaTile` type in place — other parts of the file may still reference them; only the Today usage is replaced.

## Verification

1. `tsgo` (typecheck) — must pass, especially icon imports and prop shapes.
2. Preview at mobile viewport `/home`:
   - Tools tab: search bar matches spec styling, typing filters flat grid, empty state text shows correctly, colour chips render.
   - Today tab: 6 tiles per page, dots reflect page count, tap dot switches, horizontal touch swipe advances page, "More" tile scrolls to Tools workspace.
3. Playwright screenshot of Today and Tools sections to confirm layout.
