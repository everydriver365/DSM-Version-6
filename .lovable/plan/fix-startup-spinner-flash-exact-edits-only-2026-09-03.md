# Fix startup spinner/flash — exact edits only

## Scope
Only `src/routes/index.tsx` and `src/routes/__root.tsx`. `capacitor.config.ts` untouched.

## FIX 1 — `src/routes/index.tsx`: synchronous cached-session check
Before the async `supabase.auth.getSession()` call, read `localStorage` for an existing Supabase session token. If a cached session with an `access_token` exists, call `navigate({ to: "/home", replace: true })` immediately and skip the async wait. Otherwise fall back to the existing async `getSession()` flow.

## FIX 2 — `src/routes/index.tsx`: remove stray default export
Remove `export default RootRedirect;`. The route component is already exported through `createFileRoute`, so the default export is unnecessary and breaks code splitting.

## FIX 3 — `src/routes/__root.tsx`: prevent desktop redirect inside iframe
Wrap the existing desktop redirect in an iframe guard so it does not fire inside the Lovable preview iframe (or any cross-origin parent). The redirect still fires on non-native, non-iframe desktop viewports wider than 768px.

```text
Before:
  if (!Capacitor.isNativePlatform() && window.innerWidth > 768) {
    window.location.href = "https://desktop.everydriver.pro";
  }

After:
  const isIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  if (!Capacitor.isNativePlatform() && !isIframe && window.innerWidth > 768) {
    window.location.href = "https://desktop.everydriver.pro";
  }
```

No other code changes.
