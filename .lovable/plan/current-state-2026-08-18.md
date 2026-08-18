Capacitor build fix: replace `capacitor.config.ts` and guard native plugin calls in `src/routes/__root.tsx`

## Current state
- `capacitor.config.ts` exists but has the wrong `appId`, `appName`, and `webDir`, plus the legacy `androidSplashResourceName` / `androidScaleType` fields that are causing the build error.
- `src/routes/__root.tsx` runs `StatusBar`, `Keyboard`, and `App` plugin calls unconditionally on startup, which triggers the browser/SSR error: **"Keyboard plugin is not implemented on web"**.

## Proposed fix

### 1. Replace `capacitor.config.ts`
Replace the entire file with the exact config provided, preserving:
- `appId: 'co.uk.drivingschoolmanager.dsm'`
- `webDir: '.output/public'`
- `server.url: 'https://drivingschoolmanager.co.uk'`
- `cleartext: false`
- SplashScreen plugin config

Remove the Android-only fields that break the build.

### 2. Guard native plugin calls in `src/routes/__root.tsx`
After reading the full file:
- Import `Capacitor` from `@capacitor/core`.
- In the startup `useEffect` that initializes native features, add an early return when not on a native platform:
  ```ts
  if (!Capacitor.isNativePlatform()) return;
  ```
- Wrap all native calls inside the effect in `try { ... } catch { ... }` blocks:
  - `StatusBar.setStyle({ style: Style.Dark })`
  - `StatusBar.setBackgroundColor({ color: "#0B1F3A" })`
  - `Keyboard.setAccessoryBarVisible({ isVisible: true })`
  - `Keyboard.setScroll({ isDisabled: false })`
  - `Keyboard.addListener(...)` for `keyboardWillShow` and `keyboardWillHide`
  - `App.addListener("appStateChange", ...)`
  - `App.addListener("backButton", ...)`
- Keep the cleanup `return () => { ... }` so listeners are removed when the effect re-runs or unmounts.
- Do not change any other imports, routes, components, or logic.

## Expected outcome
- The Lovable / Capacitor build no longer fails on the splash screen configuration.
- The browser preview and SSR no longer log "plugin not implemented on web" for Keyboard, StatusBar, or App.
- Native iOS/Android builds continue to get the navy status bar, keyboard accessory bar, and app-state listeners.

## Files to change
- `capacitor.config.ts`
- `src/routes/__root.tsx`
