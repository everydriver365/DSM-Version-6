
## Goal
Redesign `src/routes/index.tsx` (the DSM homepage) to a premium, Checkfront-quality SaaS aesthetic while preserving every existing section, link, image and CTA. No other routes, no backend, no functionality changes.

## Scope (files touched)
- `src/routes/index.tsx` — full visual rebuild, same content
- `src/components/marketing/MarketingNav.tsx` — refined spacing, hover, mobile polish (visual only)
- `src/components/marketing/MarketingFooter.tsx` — refined spacing/typography (visual only)
- `src/routes/__root.tsx` — add Poppins `<link>` tags in route head (fonts only)
- `src/styles.css` — add `--font-poppins` + brand color tokens under `@theme` (additive, no token removals)

Out of scope: `_marketing.*` subpages, app routes, auth, Supabase, edge functions, DB, dashboards, portals, routing.

## Design system (locked)
- Palette: Navy `#1B2B4B`, Teal `#00B5A5`, Teal-hover `#009687`, BG `#F7FAFC`, Surface `#FFFFFF`, Ink `#0F172A`, Muted `#64748B`, Hairline `#E5E9F2`
- Type: Poppins (400/500/600/700/800), loaded via `<link>` in `__root.tsx` head
  - H1: clamp(34px, 6vw, 64px), weight 700, tracking -0.02em, line-height 1.05
  - H2: clamp(28px, 4vw, 44px), weight 700, tracking -0.015em
  - H3: 20–22px, weight 600
  - Body: 16–18px, line-height 1.65, color `#475569`
  - Eyebrow: 12px, weight 600, uppercase, tracking 0.12em, teal
- Radii: cards 20–24px, buttons 12px, pills 999px
- Shadows: `0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.06)` for cards; lift to `0 16px 40px rgba(27,43,75,.12)` on hover
- Gradients (subtle):
  - Hero bg: radial 1200px ellipse top-center, `rgba(0,181,165,.10)` → transparent over `#F7FAFC`
  - CTA band: `linear-gradient(135deg, #1B2B4B 0%, #243a66 100%)` with teal glow blob
- Motion: fade+rise on scroll via IntersectionObserver (60ms stagger, 400ms, ease-out, `prefers-reduced-motion` honored). Hover: 150ms transform/shadow.

## Homepage section blueprint (preserves all current content)
1. **Hero** — eyebrow pill, big H1, lead paragraph, two CTAs (primary teal, secondary ghost-navy), trust line. Full-bleed product mock collage on the right (desktop) / below (mobile) with floating "98% Fill Rate" badge. Soft radial gradient bg.
2. **Stats bar** — 3–4 numeric stats on a white card with hairline dividers, lifted shadow, sits half-overlapping hero/next section.
3. **Diary section** — "Make light work of lesson scheduling" + 4 icon bullets in a 2x2 grid (1 col mobile) beside the diary mockup.
4. **Feature showcase** — alternating zigzag rows (image left/right). Each row: eyebrow, H2, paragraph, 3 check bullets, "Learn more" arrow link. Big rounded card-framed screenshots with soft shadow.
5. **"Apps for Everyone / Free Healthcare / Call Answering" etc.** — keep all current entries from the existing `features` array, rendered with the zigzag treatment.
6. **How it works** — 3 numbered steps as large cards with teal numerals.
7. **Testimonials** — 3-up card grid, avatar + name + role, 5-star row, italic quote.
8. **Pricing** — kept exactly as-is content-wise, restyled to large rounded cards with one "Most popular" teal-bordered card.
9. **Final CTA band** — dark navy gradient panel, white H2, teal button, secondary ghost-white link.

Every existing string, link target, image import and array item from the current `index.tsx` is preserved verbatim — only wrapper markup, classes and visual chrome change.

## Responsiveness & a11y
- Mobile-first; section padding `py-16 sm:py-24 lg:py-32`, container `max-w-[1180px] px-5 sm:px-8`
- All CTAs ≥ 44px tap height; icon-only buttons get `aria-label`
- Color contrast checked: navy on white AAA, teal `#00B5A5` reserved for ≥18px text / UI accents, not body copy
- One `<h1>`, semantic `<section>`s with `aria-labelledby`
- `prefers-reduced-motion: reduce` disables scroll/stagger animations
- Images keep existing `alt` text; lazy-load below the fold

## Performance
- No new heavy deps. Animations are CSS + a tiny IO hook (≈30 LOC) in the same file
- Poppins loaded with `preconnect` + `display=swap`, weights limited to 400/500/600/700/800
- Existing image imports reused; no new uploads

## Acceptance
- Visual: feels like Checkfront-level polish (whitespace, type rhythm, soft shadows, teal accents)
- Content: zero copy/link/section loss vs. current homepage
- Build: clean TS, no a11y regressions, mobile (440px) and desktop (1280px+) both verified via Playwright screenshots before reporting done
- No changes to any file outside the five listed above

Approve to build.
