import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getCarPlayDirectionsForLesson } from "@/lib/carplay.server";
import { jsonResponse, textResponse, corsOptionsResponse, extractBearer } from "@/lib/carplay-cors.server";

const BodySchema = z.object({
  lessonId: z.string().uuid(),
  originLat: z.number().optional(),
  originLon: z.number().optional(),
});

export const Route = createFileRoute("/api/public/carplay/v1/directions")({
  server: {
    handlers: {
      OPTIONS: corsOptionsResponse,
      POST: async ({ request }) => {
        const token = extractBearer(request);
        if (!token) {
          return textResponse("Unauthorized", { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return textResponse("Invalid JSON body", { status: 400 });
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ errors: parsed.error.flatten() }, { status: 400 });
        }

        const directions = await getCarPlayDirectionsForLesson(
          token,
          parsed.data.lessonId,
          parsed.data.originLat,
          parsed.data.originLon,
        );
        return jsonResponse({ directions });
      },
    },
  },
});
