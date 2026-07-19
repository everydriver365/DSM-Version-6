import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z
  .object({
    originLat: z.number().optional(),
    originLon: z.number().optional(),
    originPostcode: z.string().optional(),
    destination: z.string().min(2),
  })
  .refine(
    (v) => (v.originLat != null && v.originLon != null) || !!v.originPostcode,
    { message: "Provide originLat/originLon or originPostcode" },
  );

export type LessonDriveTime = {
  durationMinutes: number;
  normalDurationMinutes: number;
  trafficLabel: "Light traffic" | "Moderate traffic" | "Heavy traffic";
  originLat: number;
  originLng: number;
  destination: string;
  directionsUrl: string;
  staticMapUrl: string | null;
  routeSummary: string | null;
  distanceText: string | null;
} | null;

type CacheEntry = { value: LessonDriveTime; expires: number };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 3 * 60 * 1000;

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  // UK preference: miles
  const miles = km * 0.621371;
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

function parseDurationSeconds(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const m = v.match(/^(\d+(?:\.\d+)?)s$/);
    if (m) return Math.round(parseFloat(m[1]));
    const n = parseFloat(v);
    if (!isNaN(n)) return Math.round(n);
  }
  return 0;
}

async function geocode(
  postcode: string,
  headers: Record<string, string>,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(
      postcode + ", UK",
    )}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.text();
      console.error("[lesson-drive-time] geocode failed", res.status, body);
      return null;
    }
    const json: any = await res.json();
    const loc = json?.results?.[0]?.geometry?.location;
    if (!loc) {
      console.warn("[lesson-drive-time] geocode empty for", postcode, json?.status);
      return null;
    }
    return { lat: loc.lat, lng: loc.lng };
  } catch (err) {
    console.error("[lesson-drive-time] geocode threw", err);
    return null;
  }
}

export const getLessonDriveTime = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<LessonDriveTime> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !gmKey) {
      console.warn("[lesson-drive-time] missing LOVABLE_API_KEY or GOOGLE_MAPS_API_KEY");
      return null;
    }
    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": gmKey,
    };

    let originLat = data.originLat;
    let originLon = data.originLon;
    if ((originLat == null || originLon == null) && data.originPostcode) {
      const loc = await geocode(data.originPostcode, headers);
      if (loc) {
        originLat = loc.lat;
        originLon = loc.lng;
      }
    }
    if (originLat == null || originLon == null) return null;

    const destStr = data.destination.trim();
    const cacheKey = `${originLat.toFixed(4)},${originLon.toFixed(4)}|${destStr}`;
    const now = Date.now();
    const cached = CACHE.get(cacheKey);
    if (cached && cached.expires > now) return cached.value;

    try {
      const url = `${GATEWAY_URL}/routes/directions/v2:computeRoutes`;
      const body = {
        origin: { location: { latLng: { latitude: originLat, longitude: originLon } } },
        destination: { address: `${destStr}, UK` },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      };
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "X-Goog-FieldMask":
            "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description,routes.viewport,routes.legs.startLocation,routes.legs.endLocation",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.text();
        console.error("[lesson-drive-time] Routes API failed", res.status, b);
        return null;
      }
      const json: any = await res.json();
      const route = json?.routes?.[0];
      if (!route) {
        console.warn("[lesson-drive-time] no route returned", json);
        return null;
      }
      const trafficSec = parseDurationSeconds(route.duration);
      const normalSec = parseDurationSeconds(route.staticDuration) || trafficSec;
      if (!trafficSec) return null;

      const ratio = trafficSec / (normalSec || trafficSec);
      const trafficLabel: "Light traffic" | "Moderate traffic" | "Heavy traffic" =
        ratio < 1.15 ? "Light traffic" : ratio < 1.4 ? "Moderate traffic" : "Heavy traffic";

      const leg = route?.legs?.[0];
      const start = leg?.startLocation?.latLng;
      const end = leg?.endLocation?.latLng;
      const polyline: string | undefined = route?.polyline?.encodedPolyline;
      const viewport = route?.viewport;
      const ne = viewport?.high;
      const sw = viewport?.low;
      const visibleParam =
        ne && sw ? `&visible=${ne.latitude},${ne.longitude}|${sw.latitude},${sw.longitude}` : "";
      const staticMapUrl =
        polyline && start && end
          ? `${GATEWAY_URL}/maps/api/staticmap?size=640x220&scale=2&maptype=roadmap&format=png` +
            `&path=enc:${encodeURIComponent(polyline)}` +
            `&markers=color:green%7Clabel:S%7C${start.latitude},${start.longitude}` +
            `&markers=color:red%7Clabel:E%7C${end.latitude},${end.longitude}` +
            visibleParam
          : null;

      const directionsUrl =
        `https://www.google.com/maps/dir/?api=1` +
        `&origin=${encodeURIComponent(`${originLat},${originLon}`)}` +
        `&destination=${encodeURIComponent(destStr)}` +
        `&travelmode=driving`;

      const distanceMeters: number | undefined = route?.distanceMeters;
      const distanceText = typeof distanceMeters === "number" ? formatDistance(distanceMeters) : null;

      const value: LessonDriveTime = {
        durationMinutes: Math.max(1, Math.round(trafficSec / 60)),
        normalDurationMinutes: Math.max(1, Math.round(normalSec / 60)),
        trafficLabel,
        originLat,
        originLng: originLon,
        destination: destStr,
        directionsUrl,
        staticMapUrl,
        routeSummary: (route.description as string | undefined) || null,
        distanceText,
      };
      CACHE.set(cacheKey, { value, expires: now + TTL_MS });
      return value;
    } catch (err) {
      console.error("[lesson-drive-time] fetch threw", err);
      return null;
    }
  });
