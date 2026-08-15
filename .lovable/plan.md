# Add Nick Abbot and Full Disclosure to Recommended

Two more shows join the Recommended row at the top of the Podcasts tab, alongside The Instructor, DIPOD, Inspire and Diary Of A CEO.

## What changes

- **Full Disclosure with James O'Brien** — long-form interviews. Recommended note: "Long-form interviews and interview technique".
- **Nick Abbot** — the LBC show podcast. Recommended note: "Sharp talk radio for the driving-time habit".

Both appear as cards in the Recommended row (show art, name, note, latest episode title, big play button) and their episodes flow into the main episode list, search, topic filters and the mini player exactly like the existing shows.

They are marked recommended but not featured, so they don't crowd the driving-instructor shows in the Featured chip.

## Technical notes

- Add two entries to `PODCAST_SHOWS` in `src/lib/podcasts.ts` with `recommended: true`, `featured: false`, and categories such as `["Interviews", "Talk", "General"]` / `["Talk", "Radio", "General"]`.
- No changes needed in `src/routes/live-news.tsx` — the Recommended row and filters already render from the registry.
- Both are Global/LBC shows, so the public RSS feed URLs will be resolved and fetched once before finalising; if a feed doesn't parse or blocks server-side fetching, the show is left out rather than shipped as a broken card, and I'll tell you which one failed.
- The existing multi-feed merge already fetches feeds in parallel and caps the merged list at 60 episodes, so adding two shows won't slow the tab noticeably.

## Note

Saved/bookmark episodes from the previous plan is not included here — say the word and I'll pick it back up after this.
