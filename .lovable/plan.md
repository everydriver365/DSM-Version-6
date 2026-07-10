## What's actually in the code

The DSM Live redesign from the previous turn is present in `src/routes/dsm-live.index.tsx`:

- `view` state (`"upcoming" | "all"`) at line 56
- Upcoming / All sessions segmented toggle at lines 227–263
- Filter logic honoring `view` at line 111
- 2-column compact card grid at lines 270–283
- `CompactSessionCard` component at line 589

So the file *has* changed. If your preview still looks like the old single-column layout, it is almost certainly one of:

1. **Preview cache** — the mobile preview is showing a stale bundle.
2. **Wrong screen** — you're viewing a different route (you're currently on `/home`, not `/dsm-live`).
3. **A different screen you meant** — e.g. the swiped-schedule unification, or something else entirely.

## Proposed next step

Before touching any code again, confirm which of these is happening:

1. Hard-refresh the preview and navigate to `/dsm-live`. If the toggle + 2-column grid appear, we're done.
2. If it still looks unchanged there, screenshot what you see so I can compare against the code and find the actual gap.
3. If you meant a *different* screen (not DSM Live), tell me which one and what should look different — I'll read that component and plan the visual fix.

No files will be edited until we've identified what's actually wrong — re-applying identical changes won't help.