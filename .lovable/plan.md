You're right — the current build only loosely echoes carma-course. The hero proportions, image treatment, dark "Diary" section, feature blocks, pricing grid, and nav/footer are all visibly off when compared side-by-side. I want to redo it as a proper structural port rather than a loose remix.

## What I'll change

**Scope:** only marketing — `src/routes/index.tsx`, `src/components/marketing/MarketingNav.tsx`, `src/components/marketing/MarketingFooter.tsx`, plus the hero/section images under `src/assets/marketing/`. App routes untouched.

### 1. Scrape the source faithfully
Fetch the live carma-course HTML + computed styles section-by-section (hero, diary, features, pricing, testimonials, no-brainer formula, final CTA, nav, footer) and mirror:
- DOM structure and section order
- spacing, max-widths, type scale, radii, shadows
- exact navy `#0B1530`-family palette and blue `#1A73E8` accent
- floating stat-card positions over the hero image
- alternating light / dark navy section rhythm
- 4-tier pricing card layout with the "Most popular" highlight
- "No-Brainer Formula" comparison block

### 2. Rebuild components to match
- **MarketingNav**: white top bar (not navy) matching source, DSM wordmark left, centered nav links, "Log in" + filled blue "Get Started Free" right, UK flag pill.
- **Hero**: light dotted-grid background, two-column with headline left + product image right, two floating cards ("98% Fill rate" top-right, "500+ Active instructors" bottom-left), pill badges row, primary blue CTA + outlined "Watch Demo".
- **Diary section**: dark navy, eyebrow pill, large headline with blue accent phrase, video/screenshot card right.
- **Features**: zig-zag with real product screenshots, not stock photos.
- **Pricing**: 4 cards in one row on desktop, middle card elevated.
- **Footer**: dark navy multi-column with newsletter, matching source.

### 3. Replace hero & section imagery
Regenerate hero and feature shots to match the source's product-photo style (phone mock + dashboard composite on the hero, app screenshots in feature blocks) rather than the current generic stock images.

### 4. Tokens
Add the navy/blue/grey tokens used by the port into `src/styles.css` so components reference semantic tokens, not hex literals.

## Out of scope
- Sub-pages (`/features`, `/pricing`, `/how-it-works`, `/about`, `/contact`) — I'll align those in a follow-up once the homepage match is approved.
- App (authenticated) routes — unchanged.
- No backend/data changes.

## Verify
After build, fetch the preview homepage screenshot and compare side-by-side with carma-course at the same viewport before handing back.

Approve and I'll execute.