export const MIN_GAP_STORAGE_KEY = "schedule.minGapMinutes";
export const DEFAULT_MIN_GAP_MINUTES = 30;

export function readMinGapMinutes(): number {
  if (typeof window === "undefined") return DEFAULT_MIN_GAP_MINUTES;
  const raw = window.localStorage.getItem(MIN_GAP_STORAGE_KEY);
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MIN_GAP_MINUTES;
}

export function writeMinGapMinutes(mins: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MIN_GAP_STORAGE_KEY, String(mins));
  window.dispatchEvent(new Event("min-gap-minutes-changed"));
}