# Add episode share button

## Scope
Touch only `src/routes/live-news.tsx`. Add a share button inside the existing episode detail modal so users can share the episode externally or copy its link.

## Changes

1. **Imports**
   - Add `IconShare` from `@tabler/icons-react` to the existing icon import block.
   - Import `toast` from `sonner` for copy/share feedback.

2. **Share logic**
   - Add a `handleShareEpisode(episode)` helper inside the module.
   - URL priority: `episode.link || episode.audioUrl` (external episode page first, then audio fallback).
   - Use `navigator.share({ title, text, url })` when available.
   - Fallback: `navigator.clipboard.writeText(url)` then `toast.success("Episode link copied")`; if clipboard fails, `toast.error("Could not copy link")`.

3. **UI placement**
   - Add the share button inside the audio-controls card, below the progress bar and the existing resume/restart row.
   - Use a small DSM-styled outline button: navy/blue border, `IconShare` at 18px, label "Share".

4. **No functional changes** to playback, tabs, filters, or other modal behavior.

## Verification
- Run typecheck to confirm no import or type errors.
- Open the Podcasts tab in the preview, tap an episode, tap the new share button, and confirm the OS share sheet appears or the link is copied with a toast.
