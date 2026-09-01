# Fix the PRO TV tile showing placeholder content

The PRO TV tile on `/pro` still shows the hard-coded "How to pass your standards check" card. That mock only renders when the video query returns nothing, so the fix is to find out why nothing comes back and then make the tile honest about it.

## What I checked so far

- The tile reads the newest published row from `learn_videos` and `bitesize_videos` and falls back to a built-in mock when both are empty.
- Both queries use valid columns (no schema error), so the query shape is not the problem.
- Reading those tables anonymously returns zero rows, which is expected because access is restricted to signed-in users. Without a signed-in session I cannot yet tell whether the tables actually have published rows or the read is failing at runtime.

So the root cause is **not confirmed yet** — step 1 of the work is confirming it.

## Plan

1. **Diagnose against the live signed-in app.** Load `/pro` in the preview as a signed-in user and capture the actual result of both video queries (row counts and any error message). This tells us whether it is "no published rows" or "query/permission failure".
2. **Fix accordingly:**
   - If rows exist but the read fails, correct the query/filters so the newest video loads.
   - If no rows match, relax the filters so a video that has not been explicitly marked published (null flag) still counts, and pick the newest across the video tables.
3. **Replace the fake placeholder.** Instead of a mock video with an invented title and 18:00 duration, show a clearly-labelled empty state ("No PRO TV video yet") that still keeps the tile layout and the tap-through to `/dsm-live`.
4. **Verify** with a typecheck and a 390px preview screenshot of the tile.

## Technical notes

- Only `src/routes/pro.tsx` changes. No schema changes, no other sections touched, `capacitor.config.ts` untouched.
- Existing card design, the four tiles below it and navigation stay exactly as they are.
