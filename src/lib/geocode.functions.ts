import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { geocodeAddress, type GeocodeResult } from "./geocode.server";

export type { GeocodeResult };

export const verifyAddress = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ address: z.string().min(2).max(300) }).parse(data))
  .handler(async ({ data }): Promise<GeocodeResult> => {
    return geocodeAddress({
      address: data.address,
      lovableKey: process.env.LOVABLE_API_KEY,
      googleMapsKey: process.env.GOOGLE_MAPS_API_KEY,
    });
  });
