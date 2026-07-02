## Findings

- The 2-row horizontally scrollable marketplace grid is confirmed live in the preview on /home (verified against the running app: 2 rows, horizontal scroll, snap enabled).
- One of your two open preview windows did not respond — it's likely showing stale code. A hard refresh fixes that; no code change needed for this.
- The console shows duplicate React key warnings (`Availability` and `MTD`) on the home page. Duplicate keys can cause tiles to be duplicated, omitted, or not update visually — worth fixing.

## Plan

1. **Fix duplicate keys on the home page** (`src/routes/home.tsx` only)
   - Locate the tile/list renders keyed by label (e.g. `key={tile.title}`) where "Availability" and "MTD" appear twice.
   - Switch to a guaranteed-unique key (stable id, or `label + index` where no id exists).
   - No visual or functional changes — purely a rendering-stability fix.

2. **Verify**
   - Reload /home in the preview and confirm the duplicate-key console warnings are gone and all tiles render correctly.

## Not included

- No changes to the marketplace grid itself — it's already working as requested.