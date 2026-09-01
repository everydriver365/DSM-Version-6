# Fix SomaFM metadata and artwork on the PRO page

Nothing shows today because the now-playing feed the app calls no longer exists: `https://api.somafm.com/groovesalad.json` returns a 404 HTML page, so every fetch falls into the silent catch and the tile falls back to static text with no artwork.

## What changes

1. Use the working SomaFM endpoints
   - Track info: `https://somafm.com/songs/groovesalad.json` — returns `songs[0]` with `title`, `artist`, `album`, `albumArt`. Both endpoints send `Access-Control-Allow-Origin: *`, so the browser can call them directly.
   - Artwork: `albumArt` is frequently an empty string, so fall back to the channel logo from `https://api.somafm.com/channels.json` (`largeimage`/`xlimage` for the Groove Salad channel), fetched once and cached. Result: artwork is always present, and upgrades to real album art when SomaFM supplies it.
   - Keep the existing poll interval and the silent-failure behaviour.

2. Featured card at the top of the PRO page (the big "PRO Live Radio" card)
   - When it is in radio mode (no featured video), use the SomaFM artwork as the card image instead of the empty navy panel.
   - Title line shows the live track title, with the artist and album on the description line; the "PRO Live Radio" wording stays as the fallback before metadata arrives.
   - Play button, navigation, and card layout unchanged.

3. PRO Radio tile lower down
   - Keeps the artwork thumbnail and title/artist lines already added; they will now actually populate once the feed works.

## Technical notes

- Files touched: `src/hooks/useProRadio.ts` (endpoint + artwork fallback) and `src/routes/pro.tsx` (featured card uses the radio metadata when there is no featured video).
- The channel id stays `groovesalad` for PRO Live; the other station pills are unchanged, so their metadata behaviour is unaffected.
- Media Session metadata (lock screen / notification) benefits automatically since it already reads the same `nowPlaying` object.
- `capacitor.config.ts` is not touched.
