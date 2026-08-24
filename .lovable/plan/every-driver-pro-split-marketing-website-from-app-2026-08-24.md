# Every Driver Pro — Split Marketing Website From App

Separation only. The existing Supabase backend (`bjpqxfrihwjcqprmoqfs.supabase.co`) stays the single source of truth, untouched. No second backend, no schema changes, no data migration, no edge function changes. The Supabase client is hardcoded in `src/lib/supabaseClient.ts`, so the remixed project connects to the same backend automatically — zero config.

## Final architecture

```text
everydriver.co.uk          everydriver.pro              app.everydriver.pro
(learners, separate)       MARKETING SITE               INSTRUCTOR APP
                           (new remixed project)        (THIS project)
                                  │                            │
                                  └────── SAME EXISTING SUPABASE ──────┘
```

- `everydriver.pro` primary, `www.everydriver.pro` redirects to it
- Existing Lovable URL remains the app's fallback/dev URL

## Pre-split audit (verified against the codebase)

- **Homepage is `src/routes/index.tsx`** (it renders MarketingNav/MarketingFooter itself). There is no `_marketing.index.tsx` — the KEEP list is adjusted accordingly.
- **`_marketing.how-it-works.tsx` exists and is linked from the marketing footer.** It is not in your KEEP list, but removing it would leave a dead footer link and lose SEO content — plan keeps it. Say the word if you want it dropped.
- `health.tsx`, `perks.tsx`, `test-swap.tsx`, `payments.tsx` are **app pages** (not marketing) — they stay in this project.
- **App-side links to marketing pages:** none outside marketing components — navigation separation is already clean.
- **App-only tech that must NOT go to marketing:** OneSignal, push infra (`lib/push*.ts`, `public/sw.js`), Capacitor (`capacitor.config.ts`, `lib/openUrl.ts`, `lib/haptics.ts`, `lib/storage.ts`, `lib/platform.ts`), biometric auth, offline logic, CarPlay routes.
- **Edge functions (all stay untouched):** `square-*`, `send-sms`, `send-push`, `send-payment-email`, `send-welcome-email`, `google-calendar-sync`, `find-cheap-fuel`, `ics-feed`, `receive-sms`.
- **Server routes (stay in app project):** `api/square-create-subscription`, `api/public/square-webhook`, `api/public/send-lesson-reminders`, `api/public/news-ingest`, `api/public/carplay/*`.
- `app.everydriver.pro` is already added to this project, status **awaiting_dns** (Phase 6 completes it).

## Phases (strict order — your spec)

### Phase 1 — You: create the marketing project
Remix this project, name it **Every Driver Pro — Marketing**. Do not proceed until the remix exists.

### Phase 2 — Me (in the new project): strip to marketing only
Keep only:
- `src/routes/index.tsx` (marketing homepage), `_marketing.tsx`, `_marketing.about.tsx`, `_marketing.contact.tsx`, `_marketing.features.tsx`, `_marketing.how-it-works.tsx`, `_marketing.pricing.tsx`, `privacy.tsx`, `terms.tsx`
- `src/components/marketing/` (entire folder)
- `src/assets/` (brand/marketing images only)
- `src/lib/supabaseClient.ts` (same backend)

Remove everything else: all ~100 app routes (`home.tsx`, `login.tsx`, `register.tsx`, `forgotpassword.tsx`, `schedule.tsx`, pupils, payments, messages, admin.*, etc.), `src/components/dsm/`, OneSignal, push infrastructure, Capacitor + native deps, biometric auth, offline logic, CarPlay, all server routes (`src/routes/api/`), all edge-function callers.

### Phase 3 — Me (in the new project): wire CTAs, branding, SEO
- CTAs: **Sign In** → `https://app.everydriver.pro/login`; **Get started** / **Start free trial** → `https://app.everydriver.pro/register`
- Branding: replace every "DSM" and "Driving School Manager" with **Every Driver Pro** throughout the marketing pages
- SEO on every marketing page: unique title tags, meta descriptions, OG tags, canonical URLs
- `public/robots.txt` (allow indexing) and `public/sitemap.xml` (static file listing the marketing pages — no server routes in the marketing project)

### Phase 4 — You: test and publish the marketing project
Test on the marketing project's Lovable preview URL: all pages load, CTAs point to `app.everydriver.pro`, no DSM branding remains. Then publish.

### Phase 5 — You: move domains
Point `everydriver.pro` to the marketing project; `www.everydriver.pro` redirects to root. Add both custom domains in the marketing project settings (root primary).

### Phase 6 — You: connect `app.everydriver.pro` to this project
Finish DNS for `app.everydriver.pro` (currently awaiting_dns). On your Mac, update `capacitor.config.ts` (note: `.ts`, not `.json`) `server.url` to `https://app.everydriver.pro` — it currently points to `drivingschoolmanager.co.uk`. Rebuild Xcode and test on iPhone.

### Phase 7 — Me (in this project): strip to app only
**Only after the marketing site is confirmed live.**
- Remove: `index.tsx` marketing homepage content, `_marketing.tsx`, `_marketing.about/contact/features/how-it-works/pricing.tsx`, `privacy.tsx`, `terms.tsx` (or keep privacy/terms if app store compliance needs them in-app — flag for your call), `src/components/marketing/`, marketing-only assets
- New root route `/`: logged in → redirect `/home`; logged out → redirect `https://everydriver.pro`
- `noindex` robots meta on the app (via `__root.tsx` head)
- Any remaining references to marketing pages become absolute `https://everydriver.pro/...` URLs
- Verify: register → `/home`, login → `/home`, forgot password, all app routes, push notifications, Google Calendar sync, payments, Capacitor build

## Success criteria
- `everydriver.pro` → full marketing site, indexable, fast, no app code, CTAs → `app.everydriver.pro`
- `app.everydriver.pro` → full instructor app, not indexed, all existing features working
- One Supabase backend, zero data movement, zero downtime
