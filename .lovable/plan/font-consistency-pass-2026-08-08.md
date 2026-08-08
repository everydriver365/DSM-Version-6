# Font consistency pass

Make every route and component use the same two font families: **Poppins for body text** and **Sora for headings**. This fixes the current inconsistency where some routes use Inter, some use Poppins, some use Sora headings, and many inline styles override the global font.

## Current state

- `src/styles.css` sets body to `Inter` and headings to `Sora`.
- `src/routes/__root.tsx` already loads Inter, Sora, and Poppins from Google Fonts.
- Dozens of files hardcode `fontFamily: "Inter, sans-serif"` or `fontFamily: "Poppins, sans-serif"` inline, and some files declare a `POPPINS` constant that actually points to `Inter`.
- A few marketing routes use Poppins for everything (body and headings).
- `components/ui/sonner.tsx` hardcodes Inter.

## Plan

1. **Update global design tokens** in `src/styles.css`
   - Set body `font-family` to `Poppins, ui-sans-serif, system-ui, sans-serif`.
   - Keep headings (`h1–h4` and `.cf-section-title`) on `Sora`.

2. **Clean up inline font overrides** across the app
   - Replace `fontFamily: "Inter, sans-serif"` with inheritance (remove the override) so the global Poppins body applies.
   - Replace `fontFamily: "Poppins, sans-serif"` with inheritance where it is used on body text (it already matches the new default).
   - Where `Poppins` is used on headings inside marketing pages, let headings inherit Sora from the global rule.
   - Fix the misleading `POPPINS` constants in several route files (e.g. `admin.learn-videos.tsx`, `calendarsync.tsx`, `invoices.tsx`, `weekly-report.tsx`, etc.) that currently point to `Inter`. Either rename them to `FONT` or remove them if they only duplicate the default.

3. **Update component-level hardcoded fonts**
   - `components/ui/sonner.tsx`: remove the hardcoded Inter font.
   - Any other shared component that hardcodes Inter or Poppins.

4. **Keep marketing routes readable**
   - Marketing pages already use Poppins for body, which is the new default. Remove their explicit `fontFamily` wrappers where they only repeat the default, but leave intentional layout styling untouched.

5. **Verification**
   - Run a typecheck/build to confirm no syntax errors.
   - Spot-check the preview on home, schedule, pupils, messages, admin, and a marketing route to confirm fonts render consistently.
