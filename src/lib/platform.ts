/**
 * Runtime platform detection.
 *
 * Lets code branch between the plain web build, the current Despia wrapper,
 * and a future Capacitor (native iOS) build.
 */

export type Platform = "web" | "capacitor" | "despia";

export function getPlatform(): Platform {
  // Will be updated when Capacitor is added
  // For now everything runs as web/despia
  if (typeof window === "undefined") return "web";

  // Capacitor detection (for future use)
  if ((window as any)?.Capacitor?.isNativePlatform?.()) {
    return "capacitor";
  }

  // Despia detection
  if (
    navigator.userAgent.includes("Despia") ||
    (window as any).__DESPIA__
  ) {
    return "despia";
  }

  return "web";
}

export function isNative(): boolean {
  return getPlatform() === "capacitor";
}

export function isDespia(): boolean {
  return getPlatform() === "despia";
}

export function isWeb(): boolean {
  return getPlatform() === "web";
}

// Returns true if running in any mobile wrapper (Despia or Capacitor)
export function isMobile(): boolean {
  const p = getPlatform();
  return p === "capacitor" || p === "despia";
}
