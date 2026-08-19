/**
 * Edge-to-edge status bar setup for the native Capacitor wrapper.
 *
 * Goal: the webview should extend *under* the iOS status bar so our navy
 * headers paint behind the clock/battery, instead of the OS reserving an
 * opaque strip above the webview.
 *
 * Web builds are untouched.
 */

import { getPlatform } from "./platform";

/** Fallback inset used when the wrapper reports 0 for env(safe-area-inset-top). */
const FALLBACK_TOP_INSET = 47;

/**
 * Measures the real safe-area top inset. If the wrapper doesn't expose one
 * (some builds report 0 even when overlaying), we publish a sensible
 * fallback via --dsm-safe-top so headers never sit under the clock.
 */
function publishSafeTop() {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;height:env(safe-area-inset-top, 0px);width:0;pointer-events:none;visibility:hidden;";
  document.body.appendChild(probe);
  const measured = probe.getBoundingClientRect().height;
  probe.remove();

  const inset = measured > 0 ? measured : FALLBACK_TOP_INSET;
  document.documentElement.style.setProperty("--dsm-safe-top", `${inset}px`);
}

export function setupEdgeToEdgeStatusBar() {
  if (typeof window === "undefined") return;

  const platform = getPlatform();
  if (platform === "web") return;

  document.documentElement.classList.add("dsm-native", `dsm-${platform}`);

  publishSafeTop();
  window.addEventListener("orientationchange", () =>
    setTimeout(publishSafeTop, 250),
  );
  window.addEventListener("resize", () => publishSafeTop());
}
