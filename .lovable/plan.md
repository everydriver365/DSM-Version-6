# Fix the build after the Capacitor splash screen change

I couldn't see the exact build error, so this plan starts by reproducing it, then applies the fixes that are most likely needed based on what the splash-screen change added.

## What changed last time

- A new `capacitor.config.ts` was created at the project root (plain untyped object, `webDir: 'dist'`).
- `@capacitor/splash-screen` was added as a dependency.

Two things in that are suspect:

1. `capacitor.config.ts` sits at the repo root but is not listed in `tsconfig.json`'s `include`, while `eslint.config.js` lints the whole folder. A stray root TS file with no types can trip the lint/typecheck stage of the build.
2. `webDir: 'dist'` does not match what this app actually builds to (TanStack Start does not emit a plain `dist/`), so `npx cap sync` fails with "Could not find the web assets directory".

## Steps

1. Run the production build and capture the real error output before changing anything.
2. Fix `capacitor.config.ts`:
   - Type it properly with `CapacitorConfig` from `@capacitor/cli` (added as a dev dependency), or keep it as a plain object and explicitly exclude it from lint/typecheck — whichever the actual error points to.
   - Point `webDir` at the directory the build really produces (confirmed in step 1).
   - Keep the SplashScreen plugin block exactly as it is today.
3. If the failure is in the app bundle rather than tooling, guard the splash-screen call behind `Capacitor.isNativePlatform()` so the web build/SSR never touches a native-only plugin.
4. Re-run the build and confirm it passes, and check the preview still loads.

## Also worth fixing while in here

The preview logs a repeating runtime error: `"Keyboard" plugin is not implemented on web`. The keyboard listeners added earlier run unguarded in the browser. I'll wrap them in the same native-platform guard so the console stays clean. Say the word if you'd rather I leave that alone.

## Files touched

- `capacitor.config.ts`
- `package.json` (dev dependency only, if needed)
- `src/routes/__root.tsx` (only the native plugin guards)
