# Resume episodes where you left off

When you reopen or replay a podcast episode, playback picks up from your last listened position instead of restarting.

## What you get

- Progress is remembered per episode on this device, saved continuously while you listen.
- Tapping play on an episode you've partly heard resumes from that point automatically.
- Episode cards and the detail modal show a thin progress bar plus "12 min left" for episodes in progress, and a "Played" mark once finished.
- Finished episodes (played to within the last ~30 seconds) reset to the start, so replaying works naturally.
- A "Start from beginning" option in the episode detail modal for when you want a fresh listen.

## Technical notes

Changes are confined to `src/routes/live-news.tsx` (plus a tiny helper module if it keeps the route readable).

- Store positions in `localStorage` under `dsm.podcasts.progress.v1` as a map of `episodeId -> { position, duration, updatedAt }`, capped at 300 entries (oldest pruned).
- Load the map on mount inside `useEffect` so SSR/hydration stays clean; every read/write is guarded for `window`.
- Write on a throttle: save at most once every 5 seconds from the existing `onTimeUpdate` handler, and also on pause, on episode switch, and on `beforeunload`.
- Resume applied in the audio element's `onLoadedMetadata`: if a stored position exists and is more than 5s in and more than 30s from the end, set `el.currentTime` to it before playing. Existing explicit seeks via `ProgressBar` are unaffected.
- Mark complete on `onEnded` (position cleared, flagged played).
- The remaining-time label and progress bar reuse the existing `formatClock`/`ProgressBar` helpers and DSM tokens; no new dependencies.
