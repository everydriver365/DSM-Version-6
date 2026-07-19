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

type CacheEntry = { value: LessonWeather; expires: number };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 45 * 60 * 1000;

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export const getLessonWeather = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<LessonWeather> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !gmKey) {
      console.warn("[lesson-weather] missing LOVABLE_API_KEY or GOOGLE_MAPS_API_KEY");
      return null;
    }
    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": gmKey,
    };

    let lat = data.lat;
    let lon = data.lon;

    if ((lat == null || lon == null) && data.postcode) {
      try {
        const geoUrl = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(
          data.postcode + ", UK",
        )}`;
        const gRes = await fetch(geoUrl, { headers });
        if (!gRes.ok) {
          const body = await gRes.text();
          console.error("[lesson-weather] geocode failed", gRes.status, body);
        } else {
          const gJson: any = await gRes.json();
          const loc = gJson?.results?.[0]?.geometry?.location;
          if (loc) {
            lat = loc.lat;
            lon = loc.lng;
          } else {
            console.warn("[lesson-weather] geocode empty for", data.postcode, gJson?.status);
          }
        }
      } catch (err) {
        console.error("[lesson-weather] geocode threw", err);
      }
    }

    if (lat == null || lon == null) return null;

    const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    const now = Date.now();
    const cached = CACHE.get(cacheKey);
    if (cached && cached.expires > now) return cached.value;

    try {
      const url = `${GATEWAY_URL}/weather/v1/currentConditions:lookup?location.latitude=${lat}&location.longitude=${lon}&unitsSystem=METRIC`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const body = await res.text();
        console.error("[lesson-weather] weather API failed", res.status, body);
        return null;
      }
      const json: any = await res.json();
      const tempC = json?.temperature?.degrees;
      if (tempC == null) {
        console.warn("[lesson-weather] weather response missing temperature", json);
        return null;
      }
      const desc: string =
        json?.weatherCondition?.description?.text ??
        json?.weatherCondition?.type ??
        "Unknown";
      const value: LessonWeather = {
        tempC: Math.round(tempC),
        condition: typeof desc === "string" ? desc : "Unknown",
        icon: json?.weatherCondition?.iconBaseUri ?? "",
      };
      CACHE.set(cacheKey, { value, expires: now + TTL_MS });
      return value;
    } catch (err) {
      console.error("[lesson-weather] weather fetch threw", err);
      return null;
    }
  });
