import { useEffect, useState } from "react";

export const MIN_GAP_STORAGE_KEY = "schedule.minGapMinutes";
export const DEFAULT_MIN_GAP_MINUTES = 60;

export const GAP_WINDOW_DAYS_STORAGE_KEY = "gapFiller.windowDays";
export const DEFAULT_GAP_WINDOW_DAYS = 7;
export const GAP_WINDOW_OPTIONS = [7, 14, 21, 30] as const;

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

export function readGapWindowDays(): number {
  if (typeof window === "undefined") return DEFAULT_GAP_WINDOW_DAYS;
  const raw = window.localStorage.getItem(GAP_WINDOW_DAYS_STORAGE_KEY);
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return DEFAULT_GAP_WINDOW_DAYS;
  return GAP_WINDOW_OPTIONS.includes(n as (typeof GAP_WINDOW_OPTIONS)[number])
    ? n
    : DEFAULT_GAP_WINDOW_DAYS;
}

export function writeGapWindowDays(days: number) {
  if (typeof window === "undefined") return;
  const valid = GAP_WINDOW_OPTIONS.includes(days as (typeof GAP_WINDOW_OPTIONS)[number])
    ? days
    : DEFAULT_GAP_WINDOW_DAYS;
  window.localStorage.setItem(GAP_WINDOW_DAYS_STORAGE_KEY, String(valid));
  window.dispatchEvent(new Event("gap-window-days-changed"));
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

export function useGapWindowDays(): number {
  const [value, setValue] = useState(readGapWindowDays);

  useEffect(() => {
    const onChange = () => setValue(readGapWindowDays());
    window.addEventListener("gap-window-days-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("gap-window-days-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return value;
}

