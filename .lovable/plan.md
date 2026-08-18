# Fix: lessons added on Home don't show on the Schedule page

## What's actually wrong

The lesson saves fine. The Schedule page's lesson query is failing outright, so
the page renders with an empty list. The browser console shows:

```text
[schedule] fetch error PGRST100
"failed to parse logic tree ((pupil_id.is.null,and(pupil.status.eq.active,pupil.deleted_at.is.null)))"
```

`src/routes/schedule.tsx` (line 786) filters with:

```
.or("pupil_id.is.null,and(pupil.status.eq.active,pupil.deleted_at.is.null)")
```

That `.or(...)` references columns on the joined `pupils` table, which PostgREST
only accepts with the `referencedTable` option — as written the whole request is
rejected, the catch sets `lessons` to `[]`, and every day looks empty.

A second, smaller error also appears:

```text
[schedule] personal events fetch failed — column calendar_blocks.location does not exist
```

so private events never load either.

## The fix

1. **Lessons query** — remove the invalid `.or(...)` filter and apply the same
   rule in JavaScript after the rows come back: keep a lesson if it has no
   `pupil_id` (events), or if its joined pupil is `status = 'active'` with
   `deleted_at` null. The query already selects `status` and `deleted_at`, so no
   extra data is needed and the behaviour is unchanged.

2. **Personal events query** — make the select tolerant of the missing column so
   private events load. Confirm against the live database whether
   `calendar_blocks.location` exists; if it doesn't, either drop `location` from
   the select or add the column via a migration (matching `db/058`, which already
   declares it). Decide after checking the actual schema — no guessing.

3. Verify in the preview that the lesson added from Home now appears on the
   Schedule page for its date, and that the console errors are gone.

## Scope

- `src/routes/schedule.tsx` only, plus one optional migration for the missing
  `calendar_blocks.location` column if the check shows it is absent.
