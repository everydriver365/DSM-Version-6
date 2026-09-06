import { useEffect, useState } from "react";

export const MIN_GAP_STORAGE_KEY = "schedule.minGapMinutes";
export const DEFAULT_MIN_GAP_MINUTES = 60;

export function readMinGapMinutes(): number {
  if (typeof window === "undefined") return DEFAULT_MIN_GAP_MINUTES;
  const raw = window.localStorage.getItem(MIN_GAP_STORAGE_KEY);
  const n = raw ? parseInt(raw, 10) : NaN;
  const value = Number.isFinite(n) && n >= 0 ? n : DEFAULT_MIN_GAP_MINUTES;
  return Math.max(value, 60);
}

export function writeMinGapMinutes(mins: number) {
  if (typeof window === "undefined") return;
  const clamped = Math.max(mins, 60);
  window.localStorage.setItem(MIN_GAP_STORAGE_KEY, String(clamped));
  window.dispatchEvent(new Event("min-gap-minutes-changed"));
}

export function useMinGapMinutes(): number {
  const [value, setValue] = useState(readMinGapMinutes);

  useEffect(() => {
    const onChange = () => setValue(readMinGapMinutes());
    window.addEventListener("min-gap-minutes-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("min-gap-minutes-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return value;
}
