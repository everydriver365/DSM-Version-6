# iOS: UNIMPLEMENTED plugin warnings + WebView process crash

## What the log actually says

Two separate things:

1. `Keyboard.setAccessoryBarVisible {"code":"UNIMPLEMENTED"}`, `Keyboard.setScroll`, `StatusBar.setStyle` — these are **warnings, not the crash**. "UNIMPLEMENTED" means the JavaScript side of the plugin is present but the **native iOS pod is not installed in the Xcode project**, so Capacitor falls back to a no-op web stub. They cannot crash the app; the code already wraps each call in its own try/catch.

2. `WebView process terminated ... reason=Crash`, repeated, then `WebView loaded` again — the **WKWebView content process** is being killed and relaunched. That is a renderer-level crash (out of memory, or a hard JS/GPU fault), not a Capacitor plugin exception. The `RBSServiceErrorDomain` / `entitlement com.apple.developer.web-browser-engine.*` lines are normal simulator noise that always accompanies a web-process death — they are not the cause.

## Confirmed from the project

- `capacitor.config.ts` sets `server.url: 'https://drivingschoolmanager.co.uk'`, so the native shell loads the **live published site**, not the local `.output/public` bundle. Whatever crashes is the deployed web app.
- `package.json` lists `@capacitor/keyboard`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/app`, `@capacitor/geolocation`, `@capacitor/haptics`, `@capacitor-community/contacts`.
- There is no `ios/` folder in this project — the Xcode project lives on your machine, so the pods there are out of sync with these packages.

## Fix, in order

### Step 1 — clear the UNIMPLEMENTED warnings (your machine, not code)

In your local checkout, after pulling the latest code:

```
npm install
npx cap sync ios
cd ios/App && pod install && cd ../..
```

Then clean the build folder in Xcode (Product > Clean Build Folder) and run again. If `Keyboard`/`StatusBar` still report UNIMPLEMENTED, the pods did not install — check `ios/App/Podfile` contains `CapacitorKeyboard` and `CapacitorStatusBar`.

### Step 2 — find the real renderer crash

Because `server.url` points at the live site, the crash is reproducible in Safari. Steps:

- Connect the simulator to Safari's Develop menu (Develop > Simulator > DSM) and watch the console up to the moment the process dies.
- Note whether the crash happens on a specific screen or immediately on load, and whether memory climbs before it (Xcode's memory gauge). A steady climb to ~1GB then death means an out-of-memory renderer kill, which on this app most likely comes from the map/live-tracking screen or an unbounded list.

### Step 3 — code changes once the trigger is known

I'll only change code after step 2 identifies the screen. Likely candidates given the app:

- Live tracking (`src/routes/live.tsx`) — the map plus GPS polyline is the heaviest surface and the usual OOM suspect on device.
- Any startup work in `src/routes/__root.tsx` that runs before the first paint.

## What I will not do

- Not touching `capacitor.config.ts`.
- Not adding more try/catch around plugin calls — they are already guarded, and the UNIMPLEMENTED warnings are not the crash.

## Next step from you

Run step 1, then tell me: does the app still crash after the pods are synced, and on which screen? With that I can make a targeted fix.
