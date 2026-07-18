## Plan

1. **Confirm the actual failure mode**
   - The live preview is currently rendering the public landing page at `/`, not the instructor home app.
   - Dev-server logs show Vite is running and no current build/runtime error is visible from the sampled logs.

2. **Check why `/` is not redirecting to `/home`**
   - Inspect the current auth/session redirect flow in `src/routes/index.tsx` and the app shell in `src/routes/__root.tsx`.
   - Verify whether the preview is signed out, whether `supabase.auth.getSession()` is returning no session, or whether navigation to `/home` is failing silently.

3. **Fix the smallest related code path only**
   - If the app should open directly to the instructor dashboard when authenticated, adjust only the route/auth redirect logic needed to make `/` reliably land on `/home`.
   - If `/home` itself is failing once opened, fix the specific runtime/type issue in `src/routes/home.tsx` causing that route not to render.

4. **Validate in the preview**
   - Use the live preview/browser inspection to confirm the page renders the intended instructor home screen instead of the blank/no-preview state or marketing page.
   - Check for console/runtime errors after the fix.