## DSM by EveryDriver — scaffold plan

Build a mobile-first driving-instructor app shell on this project's existing TanStack Start + React 19 + Tailwind v4 stack, with Supabase auth via the standard `@supabase/supabase-js` package and env vars only. No Lovable Cloud / `@lovable-dev` packages.

### Stack mapping (literal spec → what actually ships)

| Spec | Built as |
|---|---|
| React 18 | React 19 (already installed) |
| Vite | Vite 7 (already installed) |
| React Router v6 | TanStack Router file-based routes in `src/routes/` |
| `/src/pages/Login.tsx` etc. | `src/routes/login.tsx`, `src/routes/home.tsx`, `src/routes/pupils.tsx`, `src/routes/schedule.tsx`, `src/routes/settings.tsx` |
| `/src/App.tsx` shell | `src/routes/__root.tsx` (already exists — extend it) |
| Poppins via `index.html` `<link>` | Poppins via `<link>` injected from `__root.tsx` `head()` |
| Tailwind config / arbitrary hex | Tailwind v4 — arbitrary hex classes like `bg-[#1A52A0]` work directly; no JS config needed |
| Supabase client from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Same — `src/lib/supabaseClient.ts` |

### Files to create

**Supabase**
- `src/lib/supabaseClient.ts` — `createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)`, exported as `supabase`.

**Design-system primitives** (`src/components/ui/`) — every value hardcoded to the spec, all using arbitrary hex Tailwind classes, no shadcn dependency, no CSS variables:
- `Button.tsx` — variants `primary` (`bg-[#1A52A0] hover:bg-[#163d7a]`), `destructive` (`bg-[#CC2229] hover:bg-[#a81b21]`), `ghost` (border `0.5px #1A52A0`, text `#1A52A0`, hover `bg-[#f0f4ff]`). Height 44px, radius 8px, Poppins 14px medium. Full width by default, `inline` prop for auto width.
- `Input.tsx` — `label` prop (12px medium `#6B7280`), 0.5px `#E2E6ED` border, radius 8px, height 44px, focus `border-[#1A52A0] outline-none`.
- `Card.tsx` — `bg-[#F8F9FB]`, 0.5px `#E2E6ED` border, radius 12px, padding 16px, no shadow.
- `StatTile.tsx` — value (24px semi-bold `#0F2044`), label (11px medium `#6B7280` uppercase `tracking-[0.05em]`). Same surface as Card.
- `SectionHeader.tsx` — 11px medium `#6B7280` uppercase `tracking-[0.05em]`, `mt-6 mb-2`.
- `BottomNav.tsx` — fixed bottom, white bg, border-top 0.5px `#E2E6ED`, height 64px. Props: `active`. 4 items: home, pupils, schedule, settings. Active `#1A52A0`, inactive `#6B7280`. Uses TanStack `<Link>`. Icons from `lucide-react` (already a project dep).

The 0.5px borders ship as inline `style={{ borderWidth: '0.5px' }}` since Tailwind utilities don't emit sub-pixel widths.

**Root shell**
- Edit `src/routes/__root.tsx`:
  - Add Poppins `<link rel="preconnect">` + stylesheet (all weights) to `head().links`.
  - Wrap `<Outlet />` in a centred 430px max-width column on `#FFFFFF` with 16px horizontal padding and bottom padding for the nav.

**Routes**
- `src/routes/index.tsx` — replace placeholder with a small redirect to `/login` (or `/home` if a Supabase session already exists) using `useNavigate` in an effect. Keeps `/` valid without duplicating any page.
- `src/routes/login.tsx` — full-screen `bg-[#0F2044]`, white text "DSM by EveryDriver" (Poppins 22px semi-bold) above a white card (radius 16px, padding 24px) holding email + password `Input`s and a primary "Sign in" `Button`. Calls `supabase.auth.signInWithPassword`; on success `navigate({ to: '/home' })`; on error shows message in `#CC2229` below the button.
- `src/routes/home.tsx` — title "Good morning, {firstName}" (20px semi-bold `#0F2044`) from `supabase.auth.getUser()` user metadata (falls back to "there"). 2-col `StatTile` grid: Today's lessons (3), This week (14), Unpaid (£240), Messages (2). One `Card` titled "Upcoming lessons" with two dummy rows (name + 24h time like `09:00`, `14:30`). `BottomNav active="home"`.
- `src/routes/pupils.tsx`, `src/routes/schedule.tsx`, `src/routes/settings.tsx` — placeholder pages: page title + a single "Coming soon" `Card`, correct `BottomNav` active state. Each has its own `head()` title + description.

All copy is sentence case. All times 24-hour. No drop shadows anywhere except the optional tip-card shadow rule (not used in this scaffold).

### Things explicitly NOT done

- No `@lovable-dev/*`, no `lovable-tagger`, no Lovable Cloud integration.
- No `supabase.auth.onAuthStateChange` listener, no `/reset-password` page, no profiles table, no protected `_authenticated` layout — the spec didn't ask and this is a UI scaffold. Easy to add later.
- No edits to `src/routeTree.gen.ts` (auto-generated).
- No `src/App.tsx` and no `src/pages/` folder — those would conflict with the TanStack shell.

### Verification before declaring done

- App builds clean.
- `/login` renders against the navy background, `/home` renders with stats + bottom nav, the other three tabs render their placeholders, bottom-nav active state moves correctly between them.
