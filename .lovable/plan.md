# Why the TestFlight build is slow and won't sign in

## What we know so far

- The iOS app is a thin shell: `capacitor.config.ts` sets `server.url = https://app.everydriver.pro`, so TestFlight loads the live website over the network instead of bundled files. That alone explains slow first paint and the "flash" between pages — every navigation is a live web load, and the splash hides before the page is ready.
- The live site is up (returns 200) and you confirmed the same site works in Safari on the same phone, so this is a native-shell problem, not a broken deploy.
- The Supabase client (`src/lib/supabaseClient.ts`) is created with default options — no explicit session storage, `persistSession`, or `detectSessionInUrl` settings. In a remote-URL WKWebView this is the usual cause of "login appears to do nothing": the session is written but the shell reloads the remote page and the session isn't picked up.
- The installed TestFlight binary predates the camera / contacts / biometric plugin work, so the live JS now calls native plugins that do not exist in that binary.

The exact sign-in failure is not yet confirmed, so the first step is to capture the real error rather than guess.

## Plan

1. **Capture the actual failure.** Add temporary on-screen diagnostics to the login screen (visible error text plus a debug line showing platform, whether a session exists after sign-in, and any thrown plugin/storage error). Connect the device to Safari Web Inspector and read console output from the TestFlight build to confirm whether the failure is a Supabase auth error, a storage write failure, or a missing-plugin exception.
2. **Harden session storage for WKWebView.** Configure the Supabase client explicitly with `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false`, and a storage adapter that falls back safely when `localStorage` is unavailable or cleared by iOS. Then navigate after sign-in only once `getSession()` resolves, instead of immediately.
3. **Make the shell resilient to missing plugins.** Audit every native plugin call that can run on app start (biometrics, badge, OneSignal, splash screen) and guard each behind a capability check so an older binary degrades instead of blocking the UI.
4. **Fix the perceived slowness and flash.** Hide the splash screen only after the app's first screen is ready rather than on a fixed 2s timer, and add a lightweight loading state so the webview does not show a white flash while the remote page loads.
5. **Ship a fresh TestFlight build.** The current binary is out of date relative to the site's JS; after the fixes, a new build must be uploaded so native plugins and the web code match.

## Technical notes

- Files expected to change: `src/lib/supabaseClient.ts`, `src/routes/login.tsx`, `src/routes/__root.tsx` (plugin guards / splash timing). `capacitor.config.ts` will not be touched.
- Keeping `server.url` pointing at the live domain means every app update to web code goes live without a new build, but native plugin changes always require a new TestFlight upload. Worth deciding later whether to bundle the web assets instead.
- No database or Supabase schema changes are involved.
