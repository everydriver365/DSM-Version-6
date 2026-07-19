import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchLessonDriveTime, type LessonDriveTime } from "./lesson-drive-time.server";

const InputSchema = z
  .object({
    originLat: z.number().optional(),
    originLon: z.number().optional(),
    originPostcode: z.string().optional(),
    destination: z.string().min(2),
  })
  .refine(
    (v) => (v.originLat != null && v.originLon != null) || !!v.originPostcode,
    { message: "Provide originLat/originLon or originPostcode" },
  );

export type { LessonDriveTime };

export const getLessonDriveTime = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<LessonDriveTime> => {
    return fetchLessonDriveTime({
      ...data,
      lovableKey: process.env.LOVABLE_API_KEY,
      googleMapsKey: process.env.GOOGLE_MAPS_API_KEY,
    });
  });
