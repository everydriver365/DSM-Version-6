import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { searchNearbyPlaces, type NearbyPlace, type NearbyResult } from "./nearest.server";

export type { NearbyPlace, NearbyResult };

export const findNearbyPlaces = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        category: z.string().min(1).max(40),
        radius: z.number().min(200).max(20000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<NearbyResult> => {
    return searchNearbyPlaces({
      lat: data.lat,
      lng: data.lng,
      category: data.category,
      radius: data.radius,
      lovableKey: process.env.LOVABLE_API_KEY,
      googleMapsKey: process.env.GOOGLE_MAPS_API_KEY,
    });
  });
