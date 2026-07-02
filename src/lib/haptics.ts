// Lightweight haptic feedback helper. No-op on unsupported devices.
export type HapticPattern = "tap" | "success" | "warning" | "error" | "selection";

const patterns: Record<HapticPattern, number | number[]> = {
  tap: 8,
  selection: 5,
  success: [10, 40, 15],
  warning: [20, 60, 20],
  error: [30, 40, 30, 40, 30],
};

export function haptic(kind: HapticPattern = "tap") {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(patterns[kind]);
    }
  } catch {
    // ignore
  }
}