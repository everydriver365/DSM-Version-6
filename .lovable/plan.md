# DSM News — Instructor News & Information

Extend the existing News section (`/news`, `news_articles` table, article detail page) rather than rebuilding it. Road Alerts stays untouched and keeps ownership of live road conditions.

## What exists today

- `/news` list page: flat feed from `news_articles`, three filter chips (All / Official / Industry).
- `/news/$articleId` detail page with sanitised body and "Read original" link.
- No admin screen for news, and no source registry — categories are free text on the article row.

## What changes

### 1. Data layer (new SQL file in `db/`)

- `news_sources`: name, url, feed_url, kind (rss / gov / social), tier (1–4), default_category, enabled, priority, created_at. Seeded with every source you listed (DVSA, Despatch, DVSA Statistics, DfT, DVLA, THINK!, National Highways, ADINJC, Intelligent Instructor, DIA, Inspire, RoSPA, IAM RoadSmart, Brake, Road Safety GB, motoring titles, X/DVSA as disabled-by-default).
- `news_articles` gains: `source_id`, `category` moves to the fixed category set, `importance` (normal / important), `why_matters`, `summary`, `dedupe_key`, `is_featured`, `display_order`, `status` (pending / approved / rejected), `related_learn_slug`, `related_podcast_id`, `extra_sources` (jsonb list for merged duplicates).
- RLS: read for authenticated instructors (approved + not hidden), write for admins/service role only.

You run this SQL against the existing Supabase project the same way as previous `db/*.sql` files.

### 2. Category system

Shared `src/lib/newsCategories.ts` with the 11 categories (Important, Instructor, Driving Tests, DVSA, Training & CPD, Road Safety, Business, Cars & EV, Technology & AI, Wellbeing, Data, General), each with emoji, colour and matching keywords used by the classifier.

### 3. Ingestion

A server route `src/routes/api/public/news-ingest.ts` (secret-protected, callable by cron):
- reads enabled `news_sources`, fetches RSS/Atom feeds,
- normalises headline / summary / date / image / link (link-out only, no full-article re-hosting),
- classifies into a category by source default + keyword rules,
- deduplicates via `dedupe_key` (normalised title) and merges extra sources onto the highest-tier record,
- flags Tier-1 rule/booking/policy items as `important`,
- writes rows as `pending` when the source requires approval, otherwise `approved`.

Optional AI summary + "Why this matters" generation runs in the same job for important items only.

### 4. News page rebuild of the *content*, not the shell

Same route, same design system, new structure:
- 🚨 Important for Instructors (only `importance = important`)
- ⭐ For You — personalised locally in the client from data the app already loads (pupils near test readiness, EV vehicle on profile, business interest), no pupil detail exposed
- Category rails: DVSA, Instructor, Driving Tests, Road Safety, Business, Cars & EV, Technology & AI, Wellbeing, Data
- 📍 Local News (policy/test-centre/campaign items matched to the instructor's area — no live traffic)
- Latest chronological feed
- Category chips replace the current All/Official/Industry chips

### 5. Card + detail upgrades

Card: category pill, headline, short summary, source, date, importance flag, thumbnail, Read button.
Detail page adds: "Why this matters" block, merged source list, and — when linked — a related DSM Learn item and a related podcast episode using the existing Learn and podcast systems (link-through only, no new player or learning platform).

### 6. Admin

New `/admin/news` inside the existing admin hub with two tabs:
- Sources: add / edit / enable / disable, tier, default category, priority.
- Articles: approve / reject, feature, hide, mark important, edit summary + why-this-matters, attach Learn content or podcast, set display order.

### 7. Notifications

Reuse the existing push system: only `importance = important` items trigger a push, with a news toggle added to the existing notification settings screen.

## Out of scope

- No changes to Road Alerts.
- No X API dependency — the DVSA X account is registered as a source but stays disabled until access is viable; the feed never depends on it.
- No re-hosting of third-party article bodies.

## Suggested order

1. SQL + categories lib
2. Ingestion route
3. News page + cards
4. Article detail extras
5. Admin screens
6. Notification hook-up
