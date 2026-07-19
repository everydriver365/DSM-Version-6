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

type LessonDriveTimeInput = {
  originLat?: number;
  originLon?: number;
  originPostcode?: string;
  destination: string;
};

type FetchLessonDriveTimeArgs = LessonDriveTimeInput & {
  lovableKey?: string;
  googleMapsKey?: string;
};

type CacheEntry = { value: LessonDriveTime; expires: number };

const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 3 * 60 * 1000;
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  const miles = km * 0.621371;
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

function parseDurationSeconds(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const match = v.match(/^(\d+(?:\.\d+)?)s$/);
    if (match) return Math.round(parseFloat(match[1]));
    const parsed = parseFloat(v);
    if (!Number.isNaN(parsed)) return Math.round(parsed);
  }
  return 0;
}

async function geocodePostcode(
  postcode: string,
  headers: Record<string, string>,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(
      `${postcode}, UK`,
    )}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const body = await response.text();
      console.error("[lesson-drive-time] geocode failed", response.status, body);
      return null;
    }

    const json: any = await response.json();
    const loc = json?.results?.[0]?.geometry?.location;
    if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
      console.warn("[lesson-drive-time] geocode empty for", postcode, json?.status);
      return null;
    }

    return { lat: loc.lat, lng: loc.lng };
  } catch (err) {
    console.error("[lesson-drive-time] geocode threw", err);
    return null;
  }
}

export async function fetchLessonDriveTime({
  originLat: initialOriginLat,
  originLon: initialOriginLon,
  originPostcode,
  destination,
  lovableKey,
  googleMapsKey,
}: FetchLessonDriveTimeArgs): Promise<LessonDriveTime> {
  if (!lovableKey || !googleMapsKey) {
    console.warn("[lesson-drive-time] missing LOVABLE_API_KEY or GOOGLE_MAPS_API_KEY");
    return null;
  }

  const headers = {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": googleMapsKey,
  };

  let originLat = initialOriginLat;
  let originLon = initialOriginLon;
  if ((originLat == null || originLon == null) && originPostcode) {
    const loc = await geocodePostcode(originPostcode, headers);
    if (loc) {
      originLat = loc.lat;
      originLon = loc.lng;
    }
  }

  if (originLat == null || originLon == null) return null;

  const destStr = destination.trim();
  const cacheKey = `${originLat.toFixed(4)},${originLon.toFixed(4)}|${destStr}`;
  const now = Date.now();
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expires > now) return cached.value;

  try {
    const response = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description,routes.viewport,routes.legs.startLocation,routes.legs.endLocation",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: originLat, longitude: originLon } } },
        destination: { address: `${destStr}, UK` },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[lesson-drive-time] Routes API failed", response.status, body);
      return null;
    }

    const json: any = await response.json();
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
          visibleParam +
          `&style=feature:water|color:0x1877D6` +
          `&style=feature:landscape|color:0xF5F0E8` +
          `&style=feature:road|element:geometry|color:0xFFFFFF` +
          `&style=feature:road|element:labels|visibility:simplified` +
          `&style=feature:poi|visibility:off` +
          `&style=feature:transit|visibility:off`
        : null;

    const directionsUrl =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${encodeURIComponent(`${originLat},${originLon}`)}` +
      `&destination=${encodeURIComponent(destStr)}` +
      `&travelmode=driving`;

    const distanceMeters: number | undefined = route?.distanceMeters;
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
      distanceText: typeof distanceMeters === "number" ? formatDistance(distanceMeters) : null,
    };

    CACHE.set(cacheKey, { value, expires: now + TTL_MS });
    return value;
  } catch (err) {
    console.error("[lesson-drive-time] fetch threw", err);
    return null;
  }
}