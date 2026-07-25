## Goal

Uploaded (non-YouTube) Learn videos currently only get a cover if an admin manually attaches an image — otherwise the card falls back to a flat colour. Make covers automatic, with a visible placeholder while uploading.

## Files touched

- `src/routes/admin.learn-videos.tsx`
- `src/routes/learn.tsx` (small placeholder polish only)

## 1. Auto-capture a poster frame from the chosen video file

In the video form, when a file is selected:

- Load it into an offscreen `<video>` via `URL.createObjectURL`, seek to ~1s (or 10% of duration, whichever is smaller), draw the frame into a `<canvas>` at 640x360, and export as JPEG (`canvas.toBlob`, quality 0.8).
- Store the result as a `File` in a new `autoThumb` state and show it as a preview thumbnail next to the file name — same 96x54 preview style already used for the YouTube thumbnail.
- Revoke the object URL after capture.

Thumbnail resolution order on save:
1. Admin-uploaded thumbnail image (existing `thumbFile`) — always wins.
2. Auto-captured frame from the video.
3. Existing `initial.thumbnail_url` when editing.

Both paths go through the existing `uploadThumbnail` helper into the `learn-videos` bucket, so no schema, bucket, or policy changes are needed.

Fallbacks: some codecs/browsers refuse to render a frame. If capture fails or the canvas comes back blank, skip silently — no error toast — and leave the manual thumbnail field as the way to fix it. Add a helper line under the file input: "A cover image is grabbed from the video automatically — upload one below to override it."

## 2. Placeholder during upload

- While `uploadStatus === "uploading"`, render the auto-captured (or selected) thumbnail in the existing progress block, dimmed with a spinner over it, so there's a visible cover the whole time.
- In the admin video list, rows without `thumbnail_url` get a neutral grey tile with a film icon instead of empty space.

## 3. Learn screen placeholder

In `learn.tsx`, `VideoCard` already prefers `thumbnail_url` then derives YouTube thumbs. Add a final placeholder layer for uploaded videos with no cover: keep the existing flat colour but overlay a centred low-opacity play/film glyph so untreated cards look deliberate rather than blank. No data-fetch changes.

## Notes

- Existing uploaded videos stay without covers until re-saved through the admin form; re-saving with no new file selected won't regenerate a frame. If you want those backfilled, the simplest route is opening each one and re-picking the file — say the word and I'll instead add a one-tap "Generate cover from video" button on each admin list row that fetches the stored video and captures a frame.
