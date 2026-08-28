const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export type NearbyPlace = {
  id: string;
  name: string;
  address: string;
  rating?: number;
  openNow?: boolean;
  lat: number;
  lng: number;
};

export type NearbyResult = {
  places: NearbyPlace[];
  error?: string;
};

type PlacesApiPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  rating?: number;
  currentOpeningHours?: { openNow?: boolean };
  location?: { latitude?: number; longitude?: number };
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.shortFormattedAddress",
  "places.location",
  "places.rating",
  "places.currentOpeningHours.openNow",
].join(",");

/** Category -> Places API (New) request. Either includedTypes (searchNearby) or textQuery (searchText). */
export const NEAREST_CATEGORIES: Record<string, { includedTypes?: string[]; textQuery?: string }> = {
  toilets: { textQuery: "public toilet" },
  food: { includedTypes: ["cafe", "coffee_shop"] },
  fuel: { includedTypes: ["gas_station"] },
  parking: { includedTypes: ["parking"] },
  ev: { includedTypes: ["electric_vehicle_charging_station"] },
  atm: { includedTypes: ["atm"] },
};

function mapPlaces(raw: PlacesApiPlace[]): NearbyPlace[] {
  return raw
    .filter((p) => typeof p.location?.latitude === "number" && typeof p.location?.longitude === "number")
    .map((p, i) => ({
      id: p.id ?? `place-${i}`,
      name: p.displayName?.text ?? "Unnamed",
      address: p.shortFormattedAddress ?? p.formattedAddress ?? "",
      rating: p.rating,
      openNow: p.currentOpeningHours?.openNow,
      lat: p.location!.latitude!,
      lng: p.location!.longitude!,
    }));
}

export async function searchNearbyPlaces(args: {
  lat: number;
  lng: number;
  category: string;
  radius?: number;
  lovableKey?: string;
  googleMapsKey?: string;
}): Promise<NearbyResult> {
  const { lat, lng, category, lovableKey, googleMapsKey } = args;
  const radius = args.radius ?? 2000;

  if (!lovableKey || !googleMapsKey) {
    return { places: [], error: "Nearby search is not configured." };
  }

  const config = NEAREST_CATEGORIES[category];
  if (!config) return { places: [], error: "Unknown category." };

  const isText = Boolean(config.textQuery);
  const path = isText ? "/places/v1/places:searchText" : "/places/v1/places:searchNearby";
  const body = isText
    ? {
        textQuery: config.textQuery,
        maxResultCount: 20,
        locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius } },
      }
    : {
        includedTypes: config.includedTypes,
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
      };

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": googleMapsKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 403) {
    const json = (await res.json().catch(() => null)) as
      | { error?: { details?: Array<{ reason?: string }> } }
      | null;
    const reason = json?.error?.details?.find((d) => d.reason)?.reason;
    if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") {
      return {
        places: [],
        error:
          'Google Maps server key is referrer-restricted. In Google Cloud Console, set the server key\'s application restrictions to "None" or "IP addresses".',
      };
    }
    if (reason === "API_KEY_SERVICE_BLOCKED") {
      return {
        places: [],
        error:
          "Google Maps server key does not allow the Places API (New). Add it to the key's allowed-APIs list.",
      };
    }
    return { places: [], error: "Google Maps request was denied (403)." };
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`[nearest] gateway failed [${res.status}]: ${text}`);
    return { places: [], error: "Could not search nearby places right now." };
  }

  const json = (await res.json()) as { places?: PlacesApiPlace[] };
  return { places: mapPlaces(json.places ?? []) };
}
