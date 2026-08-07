import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeader } from "@tanstack/react-start/server";
import {
  getCarPlayDashboard,
  getCarPlayCurrentLesson,
  getCarPlayDirectionsForLesson,
  type CarPlayDashboard,
  type CarPlayLesson,
  type LessonDriveTime,
} from "./carplay.server";

function getBearerToken(): string | null {
  const auth = getRequestHeader("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length);
}

export const getCarPlayDashboardFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CarPlayDashboard | null> => {
    const token = getBearerToken();
    if (!token) return null;
    return getCarPlayDashboard(token);
  },
);

export const getCarPlayCurrentLessonFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CarPlayLesson | null> => {
    const token = getBearerToken();
    if (!token) return null;
    return getCarPlayCurrentLesson(token);
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
    const token = getBearerToken();
    if (!token) return null;
    return getCarPlayDirectionsForLesson(token, data.lessonId, data.originLat, data.originLon);
  });

export type { CarPlayDashboard, CarPlayLesson, LessonDriveTime };
