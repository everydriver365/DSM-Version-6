# Fix: no videos on the PRO teaser page

## What's happening

The PRO TV section of the teaser page shows "No videos yet." because it reads from the `howto_videos` table, and that table currently contains **0 rows**. Verified live:

- `howto_videos` — 0 rows
- `bitesize_videos` — 8 rows (5 of them published, with YouTube thumbnails)
- `learn_videos` — 3 rows

So the query and the rendering code are fine; there is simply no content in the table it points at.

## Two ways forward

1. **Publish content into `howto_videos`** via the admin screen — no code change needed.
2. **Point the teaser at video content that exists** — recommended, so the section is never empty while `howto_videos` is unpopulated.

The plan below covers option 2.

## Change

Only `src/routes/pro-teaser.tsx` is touched. Only the PRO TV data fetch changes; layout, cards and navigation stay exactly as they are.

- Fetch from `howto_videos` (published, ordered by `sort_order`) **and** `bitesize_videos` (published, `deleted_at is null`, newest first) in the existing `Promise.allSettled` batch.
- Normalise both into the current `TvVideo` shape (`id`, `title`, `category`, `thumbnail_url`, `video_embed_url`, `video_url`).
- Prefer `howto_videos` rows first; top up with Bitesize rows so two tiles always render when any published video exists.
- Empty state text stays as-is for the genuine no-content case.

## Technical notes

- `bitesize_videos` has no `video_embed_url` or `sort_order`; map `video_embed_url` to `null` and sort by `created_at desc`.
- Bitesize thumbnails are already YouTube `hqdefault.jpg` URLs, so the existing `<img>` fallback path works unchanged.
- No changes to `MediaHub.tsx`, `pro.tsx`, `home.tsx`, other routes, or `capacitor.config.ts`.
