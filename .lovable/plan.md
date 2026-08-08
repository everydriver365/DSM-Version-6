# Podcast subscriptions inside DSM

Yes — DSM can subscribe to podcast RSS feeds and play episodes inside the app, with its own player, artwork, notes and progress. Episodes stream from the publisher's audio URL (no copies stored), which is how every podcast app works.

## What you get

- An admin screen to paste a podcast RSS feed URL and subscribe. DSM reads the feed, pulls in the show name, artwork and the back catalogue of episodes.
- Episodes land in the existing DSM Podcasts library alongside your own episodes, so instructors see one combined list.
- Playback happens in DSM's own player — title, artwork, description, seek bar, speed. No jumping out to Spotify or Apple.
- New episodes are pulled in automatically once a day.
- Per-feed controls: pause a feed, unsubscribe, or hide individual episodes.

## Technical outline

Database (new SQL file in `db/`):
- `dsm_podcast_feeds` — feed_url (unique), show title, description, artwork_url, website, category, is_active, last_fetched_at, last_error, deleted_at. RLS: read for authenticated, writes for admins; grants for `authenticated` and `service_role`.
- Extend `dsm_podcasts` with `feed_id` (nullable FK), `guid` (unique per feed), `source` ('dsm' | 'feed'), `audio_mime`, `audio_bytes`. Existing rows stay `source = 'dsm'`.
- Optional `dsm_podcast_progress` (user_id, podcast_id, position_seconds) so playback resumes where the instructor left off — say if you want this in v1.

Feed ingestion:
- `src/lib/podcastFeed.server.ts` — fetch the feed URL server-side (avoids browser CORS), parse RSS/Atom with a lightweight regex/XML parser that works on Cloudflare Workers, map `<item>` → title, description, `<enclosure url/type/length>`, `pubDate`, `itunes:duration`, `itunes:image`, `itunes:episode`, `guid`.
- `src/lib/podcasts.functions.ts` — admin-only server functions: `previewFeed` (validate a URL before subscribing), `subscribeFeed`, `refreshFeed`, `refreshAllFeeds`. Upsert episodes on `(feed_id, guid)` so refreshes never duplicate.
- `src/routes/api/public/podcasts/refresh.ts` — a POST endpoint guarded by a shared secret, calling `refreshAllFeeds`. Scheduled daily with `pg_cron` + `pg_net` against the stable project URL. A generated `PODCAST_CRON_SECRET` is used for the guard.

UI:
- `src/routes/admin.podcasts.tsx` — add a "Subscribed feeds" section: add-feed input with preview, feed list with episode counts, last-refreshed time, refresh-now, pause and unsubscribe. Feed-sourced episodes stay read-only apart from publish/hide.
- `src/routes/dsm-live.index.tsx` — show feed episodes in the library, with the show name as the source label and a filter by show.
- `src/routes/dsm-live.podcast.$podcastId.tsx` — replace the link-out buttons with the shared `VideoPlayer`-style audio player (play/pause, scrub, 15s skip, speed), keeping Spotify/Apple links as a secondary option where present.

Styling follows the existing DSM patterns: Poppins body, Sora headings, 14px base, `#1877D6` primary, `#CC2229` accents, white cards on `#DCE4F0`.

## Notes

- Streaming the publisher's own audio URL is standard podcast behaviour and stays within their terms; we won't re-host their files.
- Feeds you'd like subscribed can be added from the admin screen at any time — no code change needed per show.
