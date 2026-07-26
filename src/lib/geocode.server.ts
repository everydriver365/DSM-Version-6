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
