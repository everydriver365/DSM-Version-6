# Fix the startup spinner / login flash

## What I checked (and what is NOT broken)

1. **Notes routes are correctly registered.** There is no `src/routes/notes.tsx`; notes live in `src/routes/notes.index.tsx` (`createFileRoute("/notes/")`) and `src/routes/notes.$id.tsx` (`createFileRoute("/notes/$id")`). Both are present in the generated route tree (`routeTree.gen.ts` lines 121, 137, 735, 815). Correct for TanStack file routing — nothing to fix.
2. **No redirect loop from a Notes menu item.** `src/routes/__root.tsx` contains no reference to notes at all. Menu navigation goes through `go()` → `navigate()`; no loop.
3. **Both notes files have a valid `createFileRoute` at the top.** Confirmed.
4. **No infinite-re-render `useEffect`.** The effects in `notes.index.tsx`, `home.tsx` and `__root.tsx` all have stable dependency arrays. The console showed zero errors, zero failed requests, and a clean render.

## The actual cause of the spinner-then-flash

Two things, both real and both in code that is already there:

**A. `src/routes/index.tsx` — the spinner is by design, and it always flashes.**
`/` renders a full-screen navy spinner, then in a mount `useEffect` awaits `supabase.auth.getSession()` over the network before deciding `/home` vs `/login`. Every cold start therefore shows: spinner (as long as the network round-trip takes) → hard swap to the login screen. On a slow mobile connection this is exactly "spins for ages, then the login screen appears".

**B. `src/routes/__root.tsx` lines 984–989 — a hard external navigation on wide viewports.**
```
if (!Capacitor.isNativePlatform() && window.innerWidth > 768) {
  window.location.href = "https://desktop.everydriver.pro";
}
```
This runs after the app has already painted, so on any non-native browser wider than 768px the app renders, then immediately does a full page navigation away — seen as a flash/flicker. It also fires on a rotated tablet or a wide preview iframe.

## The fix (narrow, no new features)

1. `src/routes/index.tsx` — read the cached Supabase session synchronously first (`localStorage` session key already written by supabase-js) and redirect immediately when it is present, falling back to the async `getSession()` only when there is no cached session. This removes the network wait before the first navigation, so no long spinner.
2. `src/routes/index.tsx` — remove the stray `export default RootRedirect;`. Exporting a route component from a route file disables TanStack code splitting (this exact warning is in the dev console), so the whole page bundle must download before `/` can paint.
3. `src/routes/__root.tsx` — run the desktop redirect check before first paint rather than in a post-render effect, and skip it when the app is running inside an iframe (the Lovable preview), so the app never paints a frame it is about to throw away.

No other files touched. No `capacitor.config.ts` change. No route, auth or Supabase logic changes.
