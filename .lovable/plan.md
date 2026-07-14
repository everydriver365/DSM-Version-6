# home.tsx redesign — execution plan

Flagging before I cut, because the file is 9,264 lines and the Today panel's JSX is deeply intertwined with locally-scoped state (a big IIFE at line 4733 computes `rows`, `currentLesson`, `statSlides`, `aiInsight`, `activeList`, etc. — and it drives the same `tab` variable that the "tomorrow" preview in your new Section 6 needs). I want to confirm the approach before running it end-to-end so we don't ship a half-broken file.

## What I'll do in one pass

### 1. Rip out the carousel machinery (lines ~1673–1793)
Delete: `carouselRef`, `activeWs` / `setActiveWsState` / `setActiveWs` / `wsIsProgrammatic`, `touchStartX/Y/Time`, `isDragging`, `WS_COUNT`, `dispatchWsChange`, `scrollToWs`, `handleCarouselScroll`, the `search.ws` effect, the `dsm-workspace-request` listener effect, the touch-gesture effect, and the debug height-log effect.

Keep: `communityEmail`, `toolSearch` (dead now — will also delete), `quickPage`, `quickSearchOpen`, `quickSearchQuery`, `qaStartX` (used by quick-access grid).

### 2. Outer container: fixed → single scroll (line 4132)
Replace the `position:fixed` full-viewport shell with:
```
<div style={{ minHeight:'100dvh', background:'#F7FAFC',
              paddingBottom:'calc(80px + env(safe-area-inset-bottom, 0px))',
              fontFamily:'Poppins, sans-serif' }}>
```
InstructorTopBar stays fixed (it's `position:fixed` internally). Add `paddingTop` equal to top-bar height on the outer container so content clears it.

### 3. Delete workspace dots strip (lines 4268–4307)

### 4. Delete carousel wrapper (lines 4310–4331) and its closing `</div>` at the end of the last section

### 5. Delete 7 non-Today panels (lines 5718–7661)
Wholesale removal of `data-workspace="schedule|pupils|money|marketplace|dsm|community|tools"` sections. This kills all Pupils / Market / Community / Tools / rewards / tax / MTD-tile / weekly-goal-ring JSX per your instructions.

### 6. Trim inside the Today panel
Keep the existing IIFE (lines 4733–5716) but delete:
- `SwipeableStatsCard` invocation (line 5029) — that's the "lessons today progress ring" tile
- Any weekly-goal ring block
- The three tabs "today / tomorrow / next" switcher — simplify `tab` to always `'today'` since sections 4 & 6 render today + tomorrow separately in the new layout

Keep intact: next-lesson hero (4353–4635), needs-attention strip (4636–4731), today timeline (5034–~5490), quick-access grid (5491–5714).

### 7. Insert new sections after quick-access, inside the Today body IIFE

- **Section 1 — Navy greeting header** replaces the current navy header above the hero (lines 4351–4352). Time-of-day emoji + greeting, firstName, today's date.
- **Section 6 — This week** card: reuse `weekLessonsTotal`, `weekEarnings`, `upcomingTests`, and derive `tomorrowLessons` from existing state to render the preview list.
- **Section 7 — Money snapshot** card: reuse `weekEarnings`, `outstanding`, `todayEarnings`.
- **Section 8 — DSM Live** card: reuse whatever fetch backs the existing `DsmLiveSection` (I'll inspect and pull the first upcoming session). Hidden when empty.
- **Section 9 — Marketplace** card: reuse existing featured listings state. Hidden when empty.

### 8. Bottom nav
Leaving `<BottomNav>` untouched — it already renders Home | Schedule | Pupils | Messages | More.

### 9. Modals + PushPermissionCard + slide-in menu + notifBanner
Untouched — mounted at end of return.

## Risks I want you to sign off on

1. **`tab` state simplification**: the existing "today / tomorrow / next" tab switcher inside the timeline gets removed. Today's timeline shows today only; tomorrow shows in Section 6. Nobody links to `?tab=tomorrow` from elsewhere in the app — I'll grep to confirm. If you want the tab switcher preserved inside the timeline card, say so.
2. **`SwipeableStatsCard` deletion**: this component is imported/used only inside the Today panel. I'll delete both the invocation and the import.
3. **`AiInsightsRunner` + AI suggestions carousel**: currently mounted at the top of the Today body. Your spec doesn't mention it. Default: **keep it** (it's not a "lessons-today ring", it's AI text). Confirm if you want it gone.
4. **Sections 8 & 9 data**: I need to look at where `DsmLiveSection` and marketplace featured listings currently fetch inside the deleted panels. If the fetch lived inside a deleted panel component, I'll hoist the fetch into `HomePage`.

## Confirm and I go

Reply "go" (with any of the 4 risks flipped) and I'll execute all steps in a single edit pass and verify the typecheck passes.
