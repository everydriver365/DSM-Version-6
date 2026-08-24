# Every Driver Pro — Split Marketing Website From App

Master instruction accepted. This is a **separation, not a migration or rewrite**: the existing Supabase backend (`bjpqxfrihwjcqprmoqfs.supabase.co`) stays the single source of truth, untouched. No second Supabase project, no data copying, no schema changes, no edge function changes.

## Final architecture

```text
everydriver.co.uk          everydriver.pro              app.everydriver.pro
(learners, separate)       MARKETING SITE               INSTRUCTOR APP
                           (new Lovable project)        (THIS project)
                                  │                            │
                                  └────── SAME EXISTING SUPABASE ──────┘
```

- `everydriver.pro` primary, `www.everydriver.pro` redirects to it
- Existing Lovable URL remains the app's fallback/dev URL

## Pre-split audit (done)

- **App-side links to marketing pages:** none found outside marketing components — navigation separation is clean. Only the new marketing project's CTAs need wiring to `app.everydriver.pro`.
- **App-only tech that must NOT go to marketing:** OneSignal (`__root.tsx`, `lib/push.ts`, `api/public/carplay/v1/devices.ts`), Capacitor (`lib/openUrl.ts`, `lib/haptics.ts`, `lib/storage.ts`, `hooks/useUnreadCount.ts`, several routes), biometric auth, offline logic.
- **Edge functions in use (all stay untouched):** `square-create-payment-link`, `square-oauth-start`, `send-sms`, `send-payment-email`, `send-welcome-email`, `send-push`, `google-calendar-sync`, `find-cheap-fuel`.
- **Server routes (stay in app project):** `api/square-create-subscription`, `api/public/square-webhook`, `api/public/send-lesson-reminders`, `api/public/news-ingest`, `api/public/carplay/*`.
- **Supabase client** is hardcoded in `src/lib/supabaseClient.ts`, so a remix connects to the same backend automatically — zero config.

## Phases (strict order — your spec)

### Phase 1 — You: create the marketing project
Remix this project (Settings → "Remix this project" or ⋯ → Remix), name it **Every Driver Pro — Marketing**. The remix inherits code, assets, and the working Supabase connection.

### Phase 2 — Me (in the new project): strip to marketing only
Keep: homepage, About, Features, How it works, Pricing, Contact, FAQ-style/SEO content, Healthcare, Perks, Payments, Test Swap marketing pages, testimonials, Privacy, Terms, marketing components/images/brand assets.
Remove: all ~100 app routes, `src/components/dsm/*`, OneSignal, push infra, Capacitor + native deps, biometric, offline logic, app business logic, server routes and edge-function callers it doesn't need.

### Phase 3 — Me + you: wire and test the marketing site
- CTAs: **Sign In** → `https://app.everydriver.pro/login`, **Get Started** → `https://app.everydriver.pro/register` (app owns auth; no cross-domain session tricks).
- SEO: metadata, OG tags, structured data, canonicals, sitemap, robots.txt. Brand is **Every Driver Pro / EDP** — no "DSM" anywhere in marketing.
- Test thoroughly on the marketing project's preview URL.

### Phase 4 — You: publish the marketing project

### Phase 5 — You: move domains
Remove `everydriver.pro` + `www.everydriver.pro` from this project; connect them to the marketing project (root primary, www redirect).

### Phase 6 — You: connect `app.everydriver.pro` to this project

### Phase 7 — Me (in this project): strip to app only
**Only after the marketing site is confirmed live.** Remove marketing routes/components/assets from this project, make `/` redirect to `/home` (logged-in) or to the marketing site (logged-out), point any app references to marketing pages at absolute `https://everydriver.pro/...` URLs, add `noindex` to the app, and verify the build plus every core flow (auth, lessons, payments, calendar sync, push, Capacitor).

## Success criteria
- `everydriver.pro` → full marketing site, indexable, fast.
- `app.everydriver.pro` → full instructor app: register → `/home`, login → `/home`.
- One Supabase backend, zero data movement, all existing records untouched.
