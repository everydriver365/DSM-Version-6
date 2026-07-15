import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  originLat: z.number(),
  originLon: z.number(),
  destination: z.string().min(2),
});

export type LessonDriveTime = {
  durationMinutes: number;
  normalDurationMinutes: number;
  trafficLabel: "Light traffic" | "Moderate traffic" | "Heavy traffic";
} | null;

type CacheEntry = { value: LessonDriveTime; expires: number };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 3 * 60 * 1000; // 3 min — traffic changes faster than weather

export const getLessonDriveTime = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<LessonDriveTime> => {
    const googleKey = process.env.GOOGLE_API_KEY;
    if (!googleKey) return null;

    const originStr = `${data.originLat.toFixed(4)},${data.originLon.toFixed(4)}`;
    const destStr = data.destination.trim();
    const cacheKey = `${originStr}|${destStr}`;
    const now = Date.now();
    const cached = CACHE.get(cacheKey);
    if (cached && cached.expires > now) return cached.value;

    try {
      const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${encodeURIComponent(originStr)}` +
        `&destination=${encodeURIComponent(destStr)}` +
        `&departure_time=now&traffic_model=best_guess&mode=driving` +
        `&key=${googleKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json: any = await res.json();
      const leg = json?.routes?.[0]?.legs?.[0];
      if (!leg) return null;

      const normalSec: number = leg.duration?.value ?? 0;
      const trafficSec: number = leg.duration_in_traffic?.value ?? normalSec;
      if (!normalSec) return null;

      const ratio = trafficSec / normalSec;
      const trafficLabel: LessonDriveTime extends null
        ? never
        : "Light traffic" | "Moderate traffic" | "Heavy traffic" =
        ratio < 1.15 ? "Light traffic" : ratio < 1.4 ? "Moderate traffic" : "Heavy traffic";

      const value: LessonDriveTime = {
        durationMinutes: Math.max(1, Math.round(trafficSec / 60)),
        normalDurationMinutes: Math.max(1, Math.round(normalSec / 60)),
        trafficLabel,
      };
      CACHE.set(cacheKey, { value, expires: now + TTL_MS });
      return value;
    } catch {
      return null;
    }
  });
