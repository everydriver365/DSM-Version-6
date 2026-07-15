import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z
  .object({
    lat: z.number().optional(),
    lon: z.number().optional(),
    postcode: z.string().optional(),
  })
  .refine((v) => (v.lat != null && v.lon != null) || !!v.postcode, {
    message: "Provide lat/lon or postcode",
  });

export type LessonWeather = {
  tempC: number;
  condition: string;
  icon: string;
} | null;

// In-worker per-instance cache. Not durable across cold starts but cuts calls
// under warm load and satisfies the 30–60 min freshness requirement.
type CacheEntry = { value: LessonWeather; expires: number };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 45 * 60 * 1000;

export const getLessonWeather = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<LessonWeather> => {
    const googleKey = process.env.GOOGLE_API_KEY;
    if (!googleKey) return null;

    let lat = data.lat;
    let lon = data.lon;

    // Geocode postcode via Google if coords not supplied.
    if ((lat == null || lon == null) && data.postcode) {
      try {
        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          data.postcode + ", UK",
        )}&key=${googleKey}`;
        const gRes = await fetch(geoUrl);
        if (gRes.ok) {
          const gJson: any = await gRes.json();
          const loc = gJson?.results?.[0]?.geometry?.location;
          if (loc) {
            lat = loc.lat;
            lon = loc.lng;
          }
        }
      } catch {
        // fall through
      }
    }

    if (lat == null || lon == null) return null;

    const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    const now = Date.now();
    const cached = CACHE.get(cacheKey);
    if (cached && cached.expires > now) return cached.value;

    try {
      // Google Maps Platform Weather API — current conditions
      const url = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${googleKey}&location.latitude=${lat}&location.longitude=${lon}&unitsSystem=METRIC`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json: any = await res.json();
      const tempC = json?.temperature?.degrees;
      if (tempC == null) return null;
      const desc: string = json?.weatherCondition?.description?.text
        ?? json?.weatherCondition?.type
        ?? "Unknown";
      const value: LessonWeather = {
        tempC: Math.round(tempC),
        condition: typeof desc === "string" ? desc : "Unknown",
        icon: json?.weatherCondition?.iconBaseUri ?? "",
      };
      CACHE.set(cacheKey, { value, expires: now + TTL_MS });
      return value;
    } catch {
      return null;
    }
  });
