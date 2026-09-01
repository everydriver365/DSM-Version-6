# Add stations, recently played and featured shows under the PRO radio tile

Extend the new PRO Radio hero tile on the PRO page with the three rails from the reference image, using the station data that already exists in the app.

## What changes

Only `src/routes/pro.tsx` is edited, directly below the new `RadioHeroCard`.

**1. All stations**
A horizontal rail of station cards using the same nine stations already defined on the radio page (PRO Live, PRO 80s, PRO 90s, PRO 00s, PRO 70s, PRO 60s, PRO Chill, PRO Drive, PRO Xmas). PRO Live is the only live station: tapping it starts/keeps playback and highlights as the active navy card; the others show a "COMING SOON" label and a toast, exactly as they behave on `/radio`. Card style matches the reference — coloured square badge, station name, one-line subtitle.

**2. Recently played**
A single row showing the last station played (name, now-playing artist/show, today's listening slot) with a play button and a "View all" link to `/radio`.

**3. Featured shows**
A horizontal rail of four show cards with artwork, title and schedule text (The Morning Drive, Driving Home, Weekend Vibes, The Sunday Session), plus a "View all" link to `/radio`.

## Important note on data

Verified in the code: the radio hook (`src/hooks/useProRadio.ts`) exposes only the current station, now-playing metadata and favourites. There is **no** play-history and **no** programme/schedule data anywhere — on `/radio`, both `RecentlyPlayedSection` and `FeaturedShowsSection` are deliberately empty stubs that render nothing.

So:
- **All stations** will be fully real (same list and behaviour as `/radio`).
- **Recently played** will be derived from the current/last selected station in the hook — accurate, but only ever one entry.
- **Featured shows** has no backing data. It will be rendered from a small, clearly-labelled constant list of shows and times in `pro.tsx` so the section matches the reference visually. If you want real shows, that needs a Supabase table (e.g. `radio_shows` with title, schedule text and artwork) — say the word and I will plan that instead.

## Technical details

- Station list, tap handling and toast behaviour copied from `src/routes/radio.tsx` so the two pages stay consistent; no changes to `radio.tsx` or the radio hook.
- Rails use the existing `SCROLL_ROW` / `CARD_SNAP` helpers and `SectionHeader` in `pro.tsx`, 8px–16px radii, navy/blue tokens already in the file.
- Playback continues to run through `useProRadioContext` (shared audio element), so starting a station on the PRO page keeps playing across navigation.
- `capacitor.config.ts` untouched.
