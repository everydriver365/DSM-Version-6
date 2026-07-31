import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const inputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type ReverseGeocodeResult = {
  road: string;
  town: string;
  error?: string;
};

/**
 * Reverse geocode a coordinate through the Google Maps connector gateway.
 * The browser key is not authorised for the Geocoding API, so this must run server-side.
 */
export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ReverseGeocodeResult> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const connectorKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !connectorKey) {
      return { road: "", town: "", error: "Location lookup is not configured." };
    }

    const url = `${GATEWAY_URL}/maps/api/geocode/json?latlng=${data.lat},${data.lng}&result_type=route|street_address`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectorKey,
      },
    });

    if (response.status === 403) {
      const details: Array<{ reason?: string }> =
        (await response.json().catch(() => null))?.error?.details ?? [];
      const reason = details.find((d) => d.reason)?.reason;
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

    if (!response.ok) {
      const body = await response.text();
      console.error(`[geocode] gateway request failed [${response.status}]: ${body}`);
      return { road: "", town: "", error: "Could not look up your location." };
    }

    const json = (await response.json()) as {
      results?: Array<{
        address_components?: Array<{ long_name: string; types: string[] }>;
      }>;
    };
    const components = json.results?.[0]?.address_components ?? [];
    const road = components.find((c) => c.types.includes("route"))?.long_name ?? "";
    const town =
      components.find(
        (c) => c.types.includes("postal_town") || c.types.includes("locality"),
      )?.long_name ?? "";

    return { road, town };
  });
