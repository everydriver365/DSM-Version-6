# PRO Radio tile: live SomaFM artwork and metadata

Show the real "now playing" cover art and track info from SomaFM on the PRO Radio tile on the PRO page, instead of the static radio icon.

## What changes

- The 52x52 icon square becomes an artwork thumbnail:
  - When `radio.nowPlaying.artwork` is available, render it as an image filling the square (8px radius, cover crop).
  - When artwork is missing (before metadata loads, or a station without cover art), keep the existing blue radio icon exactly as it is today.
- Metadata lines on the tile:
  - Line 1 stays "PRO Radio" plus the LIVE badge while playing.
  - Line 2 shows the SomaFM track title (`nowPlaying.title`) while playing; unchanged marketing line when stopped.
  - Line 3 shows the artist when SomaFM provides one, otherwise the current show/station name as now.
- Artwork and text refresh automatically as the existing polling in the radio hook updates the now-playing data.

## Technical notes

- Only `src/routes/pro.tsx` changes for the tile. `src/hooks/useProRadio.ts` already exposes `nowPlaying.title` and `nowPlaying.artwork` (from SomaFM `current.cover`); if the artist is not currently surfaced there, add an `artist` field to the existing `NowPlaying` mapping in the hook — no other hook behaviour changes.
- Image gets `onError` fallback back to the icon so a broken SomaFM cover URL never leaves an empty box.
- No changes to playback controls, station tiles, other PRO sections, or `capacitor.config.ts`.
