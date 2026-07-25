## What's happening

The thumbnail code is in place, but every existing `learn_videos` row still has `thumbnail_url: null` (confirmed in the Learn page's fetch response):

- "welcome video" — uploaded file, no thumbnail
- "Stopping & Impact" — no url at all
- "Blue Light" — YouTube link `youtu.be/Jq2esSZAX9E`, no thumbnail

Thumbnails are only written when a video is created or re-saved in the admin form, so nothing shows for rows created earlier.

## Fix

1. **`src/routes/learn.tsx` — derive YouTube thumbnails at render time.**
   Add a small helper that returns `https://img.youtube.com/vi/{id}/hqdefault.jpg` from a video's `url` when it's a YouTube link, and use it in `VideoCard` as: `thumbnail_url` first, then the derived YouTube thumbnail, then the existing flat navy/blue fill. This means YouTube entries always show a thumbnail regardless of what's stored, so no admin re-save is needed.

2. **Backfill stored thumbnails for YouTube rows** so the database matches what's displayed — a one-off SQL update setting `thumbnail_url` for rows whose `url` matches a YouTube pattern.

3. **Uploaded-file videos** (like "welcome video") genuinely have no image available. These keep the flat colour fill until an admin edits the entry and attaches a thumbnail image via the new "Thumbnail image (optional)" input. I'll confirm the edit form preserves and replaces `thumbnail_url` correctly so that path works on the first try.

## Notes

Rows with no `url` at all ("Stopping & Impact") stay on the flat fill — nothing to derive from.
