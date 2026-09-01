# PRO TV tile: show latest video from any source

## Goal
Make the PRO TV tile on `/pro` display the most recently uploaded published video from across the three video tables (`howto_videos`, `bitesize_videos`, `learn_videos`) instead of only the first `howto_videos` row by `sort_order`.

Keep the current card design, thumbnail fallback, and tap destination unchanged unless requested otherwise.

## Scope
- **Only file changed:** `src/routes/pro.tsx`
- Reuse existing helpers from `src/lib/learnVideos.ts` if needed for duration/thumbnail parsing.
- No schema, migration, or capacitor changes.

## Implementation

1. **Add a unified video type for the tile**
   Define a small `ProTvVideo` type inside `src/routes/pro.tsx` that holds the normalized fields the card already uses: `id`, `title`, `description`, `thumbnail_url`, `category`, `duration_label`, `created_at`, and the originating table name.

2. **Fetch the latest row from each table in parallel**
   Extend the existing data-loading `useEffect` to run three `LIMIT 1` queries ordered by `created_at` descending:
   - `howto_videos` — select `id, title, description, video_url, video_embed_url, thumbnail_url, category, is_published, created_at`; filter `is_published = true`.
   - `bitesize_videos` — select `id, title, description, video_url, thumbnail_url, category, duration_mins, is_published, deleted_at, created_at`; filter `is_published = true` and `deleted_at is null`.
   - `learn_videos` — select `id, title, description, url, embed_url, thumbnail_url, categories, source, kind, is_published, duration, duration_seconds, created_at`; filter `is_published = true`.

3. **Pick the newest row across the three results**
   Compare `created_at` timestamps in code and keep the single most recent published row. If two rows have the same timestamp, use a deterministic precedence (e.g. `howto_videos` → `bitesize_videos` → `learn_videos`).

4. **Normalize fields for the card**
   - `category`: use the `category` string from howto/bitesize; for `learn_videos`, use the first value of the `categories` array, or fall back to `source`.
   - `duration_label`: derive from `duration_mins`, `duration_seconds`, or the text `duration` field. Use existing helpers such as `videoMinutes` / `formatVideoDuration` from `src/lib/learnVideos.ts` where applicable; if no duration is available, keep the existing fallback.
   - `thumbnail_url`: use the row’s `thumbnail_url`; fall back to the existing `proImage` asset if absent.

5. **Update `ProTvCard`**
   - Change its prop from `LearnVideo | null` to `ProTvVideo | null`.
   - Bind the title, description, category, and thumbnail to the normalized item.
   - Keep the card’s white horizontal layout, TV icon header, NEW pill, play overlay, bottom quick tiles, and tap navigation to `/dsm-live` exactly as today.
   - Preserve the existing hard-coded fallback mock (`How to pass your standards check`) when no published video exists in any of the three tables.

6. **Verify**
   - Run `bunx tsgo --noEmit -p tsconfig.json` to confirm no type errors.
   - Check the `/pro` preview at 390 px width to confirm the tile still renders correctly with real data.

## Notes / open question
- Navigation currently goes to `/dsm-live` (the PRO TV/Live hub). If you want tapping the tile to open the specific howto/bitesize/learn video in a player instead, that would need a separate player or destination route and is not included here.
