# Split marketing site from the app

## Goal
Two projects, one backend: this project becomes the app, a new project becomes the marketing site. Both keep using the existing Supabase backend (`bjpqxfrihwjcqprmoqfs.supabase.co`) — no data migration, no second database.

## Key facts (confirmed)
- Supabase URL + anon key are hardcoded in `src/lib/supabaseClient.ts` (publishable key, safe in code). Any copy of this project connects to the same backend automatically.
- Edge functions (push notifications, reminders, calendar sync) live in the Supabase project — shared by both sites with no changes.
- Marketing surface is small: `/_marketing/*`, `/`, `/login`, `/register`, `/forgotpassword`, `/resetpassword`, `/privacy`, `/terms` + `src/components/marketing/*` + marketing assets.
- App surface is everything else (~100 routes) + `src/components/dsm/*` + Capacitor/OneSignal.
- I cannot create a new Lovable project for you — that one step is yours (details below).

## Domain strategy

```text
Marketing site (new project)
  Primary:   everydriver.pro
  Redirect:  www.everydriver.pro → everydriver.pro

App (this project)
  New:       app.everydriver.pro  (add as custom domain)
  Fallback:  everydriver-dash.lovable.app
```

- Root domain sells the product (fast, SEO-friendly).
- App gets a clean subdomain for deep links and Capacitor.
- Same Supabase project behind both; no user/data duplication.

## Step-by-step

### Step 1 — You: remix this project (5 min, in the Lovable UI)
1. Open this project's Settings → "Remix this project" (or three-dot menu → Remix).
2. Name the copy something like "Every Driver Pro — Marketing".
3. Open the new project and come back to me there (or @mention it).

A remix copies all code, assets, and the hardcoded Supabase client — so the new project is connected to your existing backend from the first second. The only env var (a Google Maps browser key) may need re-adding in the new project's settings if the marketing pages use maps (currently they don't).

### Step 2 — Me (in the remix): strip it down to marketing only
Delete all app routes and keep only:
- `index.tsx`, `_marketing.tsx`, `_marketing.about.tsx`, `_marketing.contact.tsx`, `_marketing.features.tsx`, `_marketing.how-it-works.tsx`, `_marketing.pricing.tsx`, `login.tsx`, `register.tsx`, `forgotpassword.tsx`, `resetpassword.tsx`, `privacy.tsx`, `terms.tsx`
- `src/components/marketing/*`, `src/lib/tokens.ts`, `src/lib/supabaseClient.ts`, styles
- Marketing image assets

Remove from the remix:
- All other routes, `src/components/dsm/*`, Capacitor config + native deps, OneSignal, push/biometric code
- App-specific logic from `__root.tsx` (bottom nav, command palette, push sheets, offline banner)

### Step 3 — Me (in the remix): adjust auth flow
- Keep `/login` and `/register` working against the shared Supabase backend.
- After successful login/register, redirect to `https://app.everydriver.pro/home` instead of `/home`.
- Marketing nav "Sign in" CTA can link to `https://app.everydriver.pro/login` (app-side login) or keep the marketing-side login page — your call.

### Step 4 — You: publish the marketing project and move domains
1. Publish the marketing project.
2. In this (app) project: remove `everydriver.pro` and `www.everydriver.pro` from Settings → Domains.
3. In the marketing project: connect `everydriver.pro` (primary) and `www.everydriver.pro` (redirect).
4. In this (app) project: connect `app.everydriver.pro` as a new custom domain.

### Step 5 — Me (in this project): strip it down to the app
Only after the marketing site is verified live:
- Delete marketing routes: `index.tsx` → replaced with a redirect to `/home` (or to marketing for logged-out users), `_marketing.*`, `privacy.tsx`, `terms.tsx` (keep or link out), plus marketing components/assets.
- Update any app code that links to marketing pages to use absolute `https://everydriver.pro/...` URLs.

### Step 6 — Verify end-to-end
- Register on `everydriver.pro` → lands in app on `app.everydriver.pro/home`.
- Log out in app → can get back to marketing.
- Capacitor build points at `app.everydriver.pro`.
- SEO: marketing pages indexed, app pages set to noindex.

## What you do vs what I do

| Step | Owner |
|---|---|
| Remix the project | You (Lovable UI, one click) |
| Strip remix to marketing | Me |
| Publish marketing project | You (Publish button) |
| Move/connect domains | You (Settings → Domains, both projects) |
| Strip this project to app-only | Me |
| DNS changes | Usually automatic via Lovable domain flow |

## What not to do
- Don't try domain-based routing inside one project — TanStack file routing isn't built for it and it gets fragile.
- Don't move the app to the new project — the app is the big surface; moving marketing is the small lift.
- Don't create a second Supabase project — both sites share the existing one.

## Outcome
- `everydriver.pro` → lean marketing site you can iterate on without touching the app.
- `app.everydriver.pro` → the full DSM app.
- One backend, one user base, zero data migration.
