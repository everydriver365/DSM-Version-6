# Split marketing site from the app

## Goal
Separate the public marketing website from the instructor mobile/web app so each can be optimised, deployed and managed independently without creating a mess later.

## Current state
- One TanStack Start project contains both marketing and app routes.
- Marketing routes: `/`, `/about`, `/contact`, `/features`, `/how-it-works`, `/pricing`, `/login`, `/register`, `/forgotpassword`, `/resetpassword`, `/privacy`, `/terms`.
- App routes: everything else (`/home`, `/schedule`, `/pupils`, `/messages`, etc.).
- Marketing uses `src/components/marketing/*` and light-theme assets (EDP wordmark).
- App uses `src/components/dsm/*`, dark navy theme, and Capacitor/OneSignal deps.
- Domains:
  - `everydriver.pro` / `www.everydriver.pro` → currently this project (marketing + app mixed)
  - `everydriver-dash.lovable.app` → published app

## Recommended domain strategy

```text
Marketing site (new lightweight project)
  Primary: everydriver.pro
  Redirect: www.everydriver.pro → everydriver.pro

App (this project)
  Subdomain: app.everydriver.pro  (add as custom domain)
  Fallback: everydriver-dash.lovable.app
```

Why this shape:
- The root domain should sell the product and be fast/SEO-friendly.
- The app lives on a clear subdomain so users and Capacitor know where to go.
- You keep one Supabase project for auth/data; both sites point at the same backend.
- You avoid path-based hacks (`/app/*`) that break deep links and Capacitor.

## How to split it

### 1. Create a new Lovable project for the marketing site
- Use a fresh TanStack Start project.
- Copy across only the marketing surface:
  - `src/routes/_marketing.*`
  - `src/routes/index.tsx`
  - `src/routes/login.tsx`
  - `src/routes/register.tsx`
  - `src/routes/forgotpassword.tsx`
  - `src/routes/resetpassword.tsx`
  - `src/routes/privacy.tsx`
  - `src/routes/terms.tsx`
  - `src/components/marketing/*`
  - Marketing assets from `src/assets/` (EDP wordmark, hero images, etc.)
  - Shared utilities: `src/lib/tokens.ts`, `src/lib/supabaseClient.ts`, `src/styles.css` (or a trimmed marketing-only version)
- Remove Capacitor, OneSignal and app-only dependencies from the marketing project.

### 2. Simplify auth on the marketing site
- Marketing site does **not** need its own protected dashboard.
- Keep lightweight `/login` and `/register` pages that authenticate against the same Supabase project, then redirect successful users to `https://app.everydriver.pro/home`.
- Alternatively, replace them with a single "Sign in" CTA that links straight to `https://app.everydriver.pro/login`.
- Keep `/forgotpassword`, `/resetpassword`, `/privacy`, `/terms` on the marketing domain for SEO and legal discoverability.

### 3. Keep this project as the app
- Remove the marketing routes and components once the marketing project is live.
- Keep only app routes (`/home`, `/schedule`, `/pupils`, etc.) and `src/components/dsm/*`.
- The root route `/` in the app project should redirect authenticated users to `/home` and unauthenticated users to `/login` (or to the marketing site).
- Publish this project to `app.everydriver.pro`.

### 4. Re-point the custom domains
- In the marketing project: connect `everydriver.pro` and `www.everydriver.pro`, set `everydriver.pro` as primary.
- In this app project: connect `app.everydriver.pro` as primary.
- Update all hardcoded links (CTAs, emails, share links) to point at the new domains.

### 5. Shared code strategy (avoid drift)
Create a small shared package or copy these files and keep them in sync:
- Brand tokens/colours
- Supabase client setup
- Auth helpers
- Common UI primitives if marketing needs them

For now, the simplest path is to duplicate the small set of shared files and document them. If they drift, extract them into a private GitHub/npm package later.

## Migration order
1. Create the new marketing project and copy the marketing surface.
2. Publish the marketing project to a temporary Lovable URL and verify it.
3. Connect `everydriver.pro` / `www.everydriver.pro` to the marketing project.
4. Update this app project to redirect `/` to `/home` and remove marketing routes.
5. Connect `app.everydriver.pro` to this app project.
6. Update marketing CTAs and app auth redirects to use the final URLs.
7. Test end-to-end: register on marketing → redirect to app → use app → log out → land back on marketing.

## What not to do
- Do not try to keep both sites in one project using domain-based routing hacks; TanStack Start file routing is not designed for that and it will become fragile.
- Do not move the app to a new project; the app is the larger, more complex surface. Moving marketing is the smaller lift.
- Do not create a second Supabase project unless you want to duplicate users and data; both sites can share the existing backend.

## Outcome
- Marketing site: lean, fast, marketer-friendly, on `everydriver.pro`.
- App: focused, mobile-optimised, on `app.everydriver.pro`.
- Future changes to marketing copy or app features do not risk each other.
