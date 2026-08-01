import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { geocodeAddress, reverseGeocodeCoords, reverseGeocodeToOutcode as reverseGeocodeToOutcodeImpl, type GeocodeResult, type ReverseGeocodeResult, type PostcodeLookupResult } from "./geocode.server";

export type { GeocodeResult, ReverseGeocodeResult, PostcodeLookupResult };

export const verifyAddress = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ address: z.string().min(2).max(300) }).parse(data))
  .handler(async ({ data }): Promise<GeocodeResult> => {
    return geocodeAddress({
      address: data.address,
      lovableKey: process.env.LOVABLE_API_KEY,
      googleMapsKey: process.env.GOOGLE_MAPS_API_KEY,
    });
  });

/**
 * Reverse geocode a coordinate through the Google Maps connector gateway.
 * The browser key is not authorised for the Geocoding API, so this must run server-side.
 */
export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<ReverseGeocodeResult> => {
    return reverseGeocodeCoords({
      lat: data.lat,
      lng: data.lng,
      lovableKey: process.env.LOVABLE_API_KEY,
      googleMapsKey: process.env.GOOGLE_MAPS_API_KEY,
    });
  });

export const reverseGeocodeToOutcode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).parse(data),
  )
  .handler(async ({ data }): Promise<PostcodeLookupResult> => {
    return reverseGeocodeToOutcodeImpl({
      lat: data.lat,
      lng: data.lng,
      lovableKey: process.env.LOVABLE_API_KEY,
      googleMapsKey: process.env.GOOGLE_MAPS_API_KEY,
    });
  });
