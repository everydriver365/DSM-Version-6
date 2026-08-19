# Stabilize iOS startup

## Confirmed findings
- The repeated `UNIMPLEMENTED` warnings come from startup calls in `src/routes/__root.tsx`: `StatusBar.setStyle`, `Keyboard.setAccessoryBarVisible`, and `Keyboard.setScroll`.
- Status-bar setup is duplicated: `__root.tsx` calls it directly and also invokes `setupEdgeToEdgeStatusBar()`, whose helper calls `StatusBar.setStyle` again.
- The biometric implementation is already a no-plugin stub, although the obsolete biometric package is still listed as a dependency.
- The RBS entitlement, “no such process,” and GPU `IdleExit` messages occur after the WebContent process has died; they do not identify the original crash.

## Changes
1. In `src/routes/__root.tsx`, remove all StatusBar and Keyboard imports and startup calls, including the call to `setupEdgeToEdgeStatusBar()`.
2. Remove the keyboard-listener bookkeeping and cleanup that become unused. Keep the guarded Capacitor block only for the App lifecycle and Android back-button listeners.
3. In `src/lib/statusBar.ts`, delete the `configureCapacitor` function and its invocation, keeping `publishSafeTop()` and `setupEdgeToEdgeStatusBar()` so safe-area measurement still runs with no plugin call.
4. Remove `@aparajita/capacitor-biometric-auth` from `package.json` dependencies, keeping the safe `src/lib/biometric.ts` stub. `capacitor.config.ts` is not touched.

## Verification
- Search the runtime bundle source to confirm no StatusBar, Keyboard, or biometric-plugin startup imports remain.
- Run the relevant type/build checks.
- Verify the browser preview still loads and navigation works.
- Rebuild/sync the iOS project and confirm the three `UNIMPLEMENTED` warnings are gone on both simulator and device. If WebKit still terminates, capture the first crash report/exception before the RBS follow-on noise; that will identify the remaining native or WebContent fault rather than guessing from aftermath logs.
