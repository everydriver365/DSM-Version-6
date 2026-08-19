# WebP decode errors in the iOS log

## What the log is

`makeImagePlus: *** ERROR: 'WEBP'-_reader->initImage[0] failed err=-50` comes from iOS ImageIO, not from JavaScript. It means WebKit was handed bytes it could not decode as a WebP image. It is a warning per failed image, repeated once per `<img>` attempt. It does not crash the WebView and it is not caused by the trip-report safe-area change in `src/routes/live.tsx` — that change touched layout only, no images.

## Where the images come from

Confirmed by reading the code:

- There are no `.webp` files in the project; every asset in `src/assets` is PNG/JPG.
- The only WebP that can reach the app is remote: news article images (`news_articles.image_url`), podcast artwork (`podcasts` / episode `imageUrl`), DSM Live session images, and marketplace images — rendered in `src/routes/live-news.tsx` and `src/components/home/DiscoverSection.tsx`.

Typical cause of `err=-50`: the remote host returns something that is not the image (an HTML hotlink-block page, a redirect, a 403), or an animated/extended WebP variant iOS rejects. The `<img>` tags currently have no `onError` handling, so each broken URL retries and logs.

## Proposed change

Handle broken remote images gracefully rather than chasing the log line:

1. In `src/routes/live-news.tsx` and `src/components/home/DiscoverSection.tsx`, add an `onError` handler to each remote `<img>` that hides the image and falls back to the existing neutral `#EEF2F7` placeholder block already used when `image_url` is null.
2. Add `loading="lazy"` and `decoding="async"` to those remote images so off-screen artwork is not decoded on load.
3. No changes to `capacitor.config.ts`, `live.tsx`, or any native setup.

## What this does and does not fix

- Broken artwork will no longer show as an empty box, and the repeated decode attempts stop for images that fail once.
- The underlying remote URLs are still bad; if you want them fixed at source, the next step is to identify which feed rows carry the failing URLs and re-fetch or replace them. Tell me if you want that as a follow-up.

## Files to change

- `src/routes/live-news.tsx`
- `src/components/home/DiscoverSection.tsx`
