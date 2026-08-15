Podcasts UI: bigger play buttons and remove external platform links

Goal
Make the play button on the Podcasts tab more obvious and larger, and remove the links that open episodes on external podcast platforms.

Current state
- The main episode list cards use a 36×36 px circular play button (src/routes/live-news.tsx ~lines 983-1015).
- The recommended show row uses a 30×30 px circular play button (~lines 658-694).
- The episode detail modal uses a 42×42 px circular play button (~lines 1482-1503).
- The episode detail modal also renders an “Open episode page” link pointing to `episode.link`, which opens the episode on the podcast’s hosting platform (~lines 1591-1609).
- The mini-player controls are already reasonably sized; the primary play button there is 38×38 px.

Changes
1. Enlarge the play button across all primary Podcasts surfaces:
   - Episode card: increase from 36×36 px to 48×48 px; use the DSM primary blue (#1877D6) with a white filled play icon and a subtle shadow.
   - Recommended show row: increase from 30×30 px to 44×44 px; match the same style.
   - Episode detail modal: increase from 42×42 px to 52×52 px; same style.
   - Keep the icon proportionate and the button centered/accessible.
2. Make the play button visually obvious:
   - Use high-contrast white icon on a solid #1877D6 circle.
   - Add a soft shadow (e.g., `0 3px 8px rgba(24,119,214,0.25)`).
   - Ensure the active (now-playing) state remains clear.
3. Remove the external-platform link:
   - Delete the “Open episode page” link in the episode detail modal.
   - Leave the `episode.link` data in `PodcastEpisode` untouched so it is still available for future use; only remove it from the UI.

Scope limits
- Only touch src/routes/live-news.tsx for this work.
- No changes to the podcast data model, feeds, or server functions.
- No changes to other tabs (Live, News) or unrelated route files.
