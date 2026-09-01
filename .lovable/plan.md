# Use the PRO logo on the PRO TV tile

When no video is available, the PRO TV tile currently shows generic placeholder artwork. Change it so the tile shows the PRO logo instead.

## Change

- In the PRO TV card, when the loaded video has no thumbnail (or no video has loaded yet), display the PRO logo image centred inside the thumbnail area, sized to fit with padding rather than stretched or cropped, on the existing card background.
- When a real video with a thumbnail is available, that thumbnail keeps showing as it does now.
- Everything else on the tile — header, NEW pill, play button, duration label, title, category, description, tap-through to `/dsm-live` — stays exactly as it is.

## Technical notes

- Only `src/routes/pro.tsx` changes: swap the `proImage` fallback for the PRO logo asset with `objectFit: contain`.
- No data, query, schema or navigation changes. `capacitor.config.ts` untouched.
