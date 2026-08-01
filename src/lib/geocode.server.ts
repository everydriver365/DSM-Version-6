const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export type GeocodeResult = {
  verified: boolean;
  formattedAddress: string | null;
  reason?: string;
};

export async function geocodeAddress(args: {
  address: string;
  lovableKey?: string;
  googleMapsKey?: string;
}): Promise<GeocodeResult> {
  const { address, lovableKey, googleMapsKey } = args;
  if (!lovableKey || !googleMapsKey) {
    return { verified: false, formattedAddress: null, reason: "missing_credentials" };
  }

  const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=uk`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": googleMapsKey,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[geocode] gateway failed [${res.status}]: ${body}`);
    return { verified: false, formattedAddress: null, reason: `gateway_${res.status}` };
  }

  const json = (await res.json()) as {
    status?: string;
    results?: Array<{ formatted_address?: string }>;
  };

  if (json.status === "OK" && (json.results?.length ?? 0) > 0) {
    return {
      verified: true,
      formattedAddress: json.results?.[0]?.formatted_address ?? null,
    };
  }

  if (json.status && json.status !== "ZERO_RESULTS") {
    console.error(`[geocode] google status: ${json.status}`);
  }
  return { verified: false, formattedAddress: null, reason: json.status ?? "no_results" };
}

export type ReverseGeocodeResult = {
  road: string;
  town: string;
  error?: string;
};

export async function reverseGeocodeCoords(args: {
  lat: number;
  lng: number;
  lovableKey?: string;
  googleMapsKey?: string;
}): Promise<ReverseGeocodeResult> {
  const { lat, lng, lovableKey, googleMapsKey } = args;
  if (!lovableKey || !googleMapsKey) {
    return { road: "", town: "", error: "Location lookup is not configured." };
  }

  const url = `${GATEWAY_URL}/maps/api/geocode/json?latlng=${lat},${lng}&result_type=route|street_address`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": googleMapsKey,
    },
  });

  if (res.status === 403) {
    const body = (await res.json().catch(() => null)) as
      | { error?: { details?: Array<{ reason?: string }> } }
      | null;
    const reason = body?.error?.details?.find((d) => d.reason)?.reason;
    if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") {
      return {
        road: "",
        town: "",
        error:
          'Google Maps server key is referrer-restricted. In Google Cloud Console, set the server key\'s application restrictions to "None" or "IP addresses".',
      };
    }
    if (reason === "API_KEY_SERVICE_BLOCKED") {
      return {
        road: "",
        town: "",
        error:
          "Google Maps server key does not allow the Geocoding API. Add it to the server key's allowed-APIs list.",
      };
    }
    return { road: "", town: "", error: "Google Maps request was denied (403)." };
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`[geocode] reverse gateway failed [${res.status}]: ${body}`);
    return { road: "", town: "", error: "Could not look up your location." };
  }

  const json = (await res.json()) as {
    results?: Array<{ address_components?: Array<{ long_name: string; types: string[] }> }>;
  };
  const components = json.results?.[0]?.address_components ?? [];
  const road = components.find((c) => c.types.includes("route"))?.long_name ?? "";
  const town =
    components.find((c) => c.types.includes("postal_town") || c.types.includes("locality"))
      ?.long_name ?? "";

  return { road, town };
}

export type PostcodeLookupResult = {
  outcode: string | null;
  error?: string;
};

export async function reverseGeocodeToOutcode(args: {
  lat: number;
  lng: number;
  lovableKey?: string;
  googleMapsKey?: string;
}): Promise<PostcodeLookupResult> {
  const { lat, lng, lovableKey, googleMapsKey } = args;
  if (!lovableKey || !googleMapsKey) {
    return { outcode: null, error: "Location lookup is not configured." };
  }

  const url = `${GATEWAY_URL}/maps/api/geocode/json?latlng=${lat},${lng}&result_type=postal_code`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": googleMapsKey,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[geocode] outcode lookup failed [${res.status}]: ${body}`);
    return { outcode: null, error: `gateway_${res.status}` };
  }

  const json = (await res.json()) as {
    status?: string;
    results?: Array<{ address_components?: Array<{ long_name?: string; types?: string[] }> }>;
  };

  const postalComponent = json.results?.[0]?.address_components?.find((c) =>
    c.types?.includes("postal_code"),
  );
  const fullPostcode = postalComponent?.long_name ?? null;
  const outcode = fullPostcode ? fullPostcode.trim().split(" ")[0].toUpperCase() : null;

  if (!outcode) {
    return { outcode: null, error: json.status ?? "no_postcode_found" };
  }
  return { outcode };
}
