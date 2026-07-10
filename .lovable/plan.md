## Goal
Replace the repeated per-route background + padding wrappers with a single shared `PageLayout` component so the canvas color and gutters are defined in exactly one place.

## Why
Right now every route sets its own `min-h-screen bg-[#EEF2F7]` (or inline `background: "#EEF2F7"`) and its own horizontal padding. That's why Messages, Payments, and Schedule each drifted — the color/padding lives in ~60 files instead of one. A shared wrapper makes future changes a one-line edit.

## Design

New component: `src/components/PageLayout.tsx`

```tsx
type PageLayoutProps = {
  children: React.ReactNode;
  /** Remove horizontal gutter (e.g. full-bleed calendars, maps). Default: false */
  noPadding?: boolean;
  /** Override background (e.g. auth screens on dark navy). Default: app canvas */
  background?: string;
  className?: string;
};
```

Responsibilities:
- `min-h-screen`
- Background = `#EEF2F7` (single source of truth)
- Horizontal padding = `16px` (matches current app-wide gutter)
- Bottom padding = `calc(80px + env(safe-area-inset-bottom))` for the mobile tab bar
- Respects `noPadding` for pages that manage their own gutters (schedule calendar strip, full-bleed home hero sections)

## Scope of changes

1. **Create** `src/components/PageLayout.tsx`.
2. **Refactor routes** — replace the outermost `<div className="min-h-screen bg-[#EEF2F7] ...">` (or inline-styled equivalent) with `<PageLayout>`. Applies to the ~58 route files previously touched, plus `schedule.tsx`, `messages.index.tsx`, `payments.tsx`.
3. **Leave alone**:
   - `src/routes/__root.tsx` (still controls the html/body shell + auth-screen dark bg)
   - Auth routes with intentional dark navy backgrounds
   - Any nested component that isn't the page's outer wrapper
4. **Home page**: has 4 wrapper variants for different states — wrap each in `PageLayout` rather than trying to collapse them.
5. **Schedule**: use `<PageLayout noPadding={false}>` and drop its inline background/padding style.

## Non-goals
- No visual changes — same color (`#EEF2F7`), same 16px gutter, same bottom safe-area.
- No changes to page content, headers, or business logic.
- No changes to `__root.tsx` background logic.

## Verification
- Build passes.
- Spot-check Messages, Payments, Schedule, Home, Profile at 390px viewport — backgrounds and gutters unchanged.
- Grep for remaining `bg-[#EEF2F7]` / `#EEF2F7` in routes should return zero hits outside `PageLayout.tsx` and `__root.tsx`.
