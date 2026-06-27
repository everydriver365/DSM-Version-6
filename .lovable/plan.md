# Port carma-course design to DSM marketing site

I fetched https://carma-course.lovable.app and have its full layout, copy structure, color treatment, and asset URLs. I'll rebuild the DSM marketing site to match.

## Visual direction (from source)
- Dark navy chrome (`#0A1024`-ish) on nav and dark sections, light grey dotted-grid hero background, blue primary (`#1A73E8`-ish), green accent for "free" pills.
- Bold, heavy sans-serif headlines (Inter/system) with blue underline accent on key phrases ("Free for Life").
- Hero = left copy + right hero image with floating stat cards ("98% Fill rate", "500+ Active instructors").
- Alternating light/dark sections; feature blocks = text + image, zig-zag.
- 4-card pricing tier row with image header per card.
- "No-brainer formula" comparison list section.

## Pages to rebuild
1. `src/routes/index.tsx` — full homepage clone (hero, "Your diary your way", feature zig-zag, 3-step how-it-works, 4-tier pricing, testimonials, comparison formula, final CTA).
2. `src/routes/_marketing.features.tsx` — feature deep-dive grid styled to match.
3. `src/routes/_marketing.pricing.tsx` — 4-tier card layout + compare table.
4. `src/routes/_marketing.how-it-works.tsx` — 3-step layout matching source.
5. `src/routes/_marketing.about.tsx` — dark hero + content sections in same style.
6. `src/routes/_marketing.contact.tsx` — matching dark hero + form.
7. `src/components/marketing/MarketingNav.tsx` — DSM cube logo + "Driving School Manager" wordmark, horizontal links (Home, Features, Websites & Domains, Telematics, Dashcam, Pricing, About, Contact), right side: Log in + blue rounded "Get Started Free" pill.
8. `src/components/marketing/MarketingFooter.tsx` — match dark footer columns of source.

## Assets
Hero/feature imagery will be generated locally via `imagegen` to avoid hot-linking carma-course's assets:
- hero composite (instructor + phone + map)
- diary screenshot mock
- payments screenshot mock
- website mock
- pupil app mock
- marketing/SEO mock
- telematics mock
- dashcam mock
- driving-school dashboard mock

Stored in `src/assets/marketing/` and imported as ES6 image imports.

## Design tokens
- Add marketing-specific tokens (deep navy `--marketing-bg`, hero-grid background, blue primary, green free-tag) to `src/styles.css` under `@theme` so utilities like `bg-marketing-navy` work. Existing app tokens untouched.
- Tailwind v4 conventions only.

## Out of scope
- Auth-aware redirect on `/` is preserved as-is.
- No copy from carma-course is used verbatim where it references EveryDriver-only features that don't apply; copy is adapted to DSM/EveryDriver branding already in the project.
- App routes (logged-in product) are untouched.

## Technical notes
- All updates stay in marketing files + `src/styles.css` + new `src/assets/marketing/`.
- Each route file gets unique `head()` metadata (title, description, og).
- Mobile: hero stacks, feature zig-zag becomes single column, pricing scrolls horizontally on small screens.

Confirm and I'll build it.