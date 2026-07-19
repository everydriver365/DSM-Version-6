export type LessonWeather = {
  tempC: number;
  condition: string;
  icon: string;
} | null;

type LessonWeatherInput = {
  lat?: number;
  lon?: number;
  postcode?: string;
};

type FetchLessonWeatherArgs = LessonWeatherInput & {
  lovableKey?: string;
  googleMapsKey?: string;
};

type CacheEntry = { value: LessonWeather; expires: number };

const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 45 * 60 * 1000;
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

async function geocodePostcode(
  postcode: string,
  headers: Record<string, string>,
): Promise<{ lat: number; lon: number } | null> {
  try {
    const geoUrl = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(
      `${postcode}, UK`,
    )}`;
    const response = await fetch(geoUrl, { headers });

    if (!response.ok) {
      const body = await response.text();
      console.error("[lesson-weather] geocode failed", response.status, body);
      return null;
    }

    const json: any = await response.json();
    const loc = json?.results?.[0]?.geometry?.location;
    if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
      console.warn("[lesson-weather] geocode empty for", postcode, json?.status);
      return null;
    }

    return { lat: loc.lat, lon: loc.lng };
  } catch (err) {
    console.error("[lesson-weather] geocode threw", err);
    return null;
  }
}

export async function fetchLessonWeather({
  lat: initialLat,
  lon: initialLon,
  postcode,
  lovableKey,
  googleMapsKey,
}: FetchLessonWeatherArgs): Promise<LessonWeather> {
  if (!lovableKey || !googleMapsKey) {
    console.warn("[lesson-weather] missing LOVABLE_API_KEY or GOOGLE_MAPS_API_KEY");
    return null;
  }

  const headers = {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": googleMapsKey,
  };

  let lat = initialLat;
  let lon = initialLon;

  if ((lat == null || lon == null) && postcode) {
    const loc = await geocodePostcode(postcode, headers);
    if (loc) {
      lat = loc.lat;
      lon = loc.lon;
    }
  }

  if (lat == null || lon == null) return null;

  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const now = Date.now();
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expires > now) return cached.value;

  try {
    const url = `${GATEWAY_URL}/weather/v1/currentConditions:lookup?location.latitude=${lat}&location.longitude=${lon}&unitsSystem=METRIC`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const body = await response.text();
      console.error("[lesson-weather] weather API failed", response.status, body);
      return null;
    }

    const json: any = await response.json();
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
}