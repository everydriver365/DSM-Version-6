import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchLessonWeather, type LessonWeather } from "./lesson-weather.server";

const InputSchema = z
  .object({
    lat: z.number().optional(),
    lon: z.number().optional(),
    postcode: z.string().optional(),
  })
  .refine((v) => (v.lat != null && v.lon != null) || !!v.postcode, {
    message: "Provide lat/lon or postcode",
  });

export type { LessonWeather };

export const getLessonWeather = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<LessonWeather> => {
    return fetchLessonWeather({
      ...data,
      lovableKey: process.env.LOVABLE_API_KEY,
      googleMapsKey: process.env.GOOGLE_MAPS_API_KEY,
    });
  });
