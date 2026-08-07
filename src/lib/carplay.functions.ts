import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getCarPlayDashboard,
  getCarPlayCurrentLesson,
  getCarPlayDirectionsForLesson,
  type CarPlayDashboard,
  type CarPlayLesson,
  type LessonDriveTime,
} from "./carplay.server";


export const getCarPlayDashboardFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CarPlayDashboard | null> => {
    // In internal usage this should be called with an authenticated session;
    // for native apps use the public REST endpoints below.
    return null;
  },
);

export const getCarPlayCurrentLessonFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CarPlayLesson | null> => {
    return null;
  },
);

const DirectionsInputSchema = z.object({
  lessonId: z.string().uuid(),
  originLat: z.number().optional(),
  originLon: z.number().optional(),
});

export const getCarPlayDirectionsForLessonFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => DirectionsInputSchema.parse(data))
  .handler(async ({ data }): Promise<LessonDriveTime | null> => {
    return null;
  });

export type { CarPlayDashboard, CarPlayLesson, LessonDriveTime };
