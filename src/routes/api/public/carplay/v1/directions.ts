import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getCarPlayDirectionsForLesson } from "@/lib/carplay.server";

const BodySchema = z.object({
  lessonId: z.string().uuid(),
  originLat: z.number().optional(),
  originLon: z.number().optional(),
});

export const Route = createFileRoute("/api/public/carplay/v1/directions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("Authorization");
        if (!auth || !auth.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = auth.slice("Bearer ".length);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ errors: parsed.error.flatten() }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const directions = await getCarPlayDirectionsForLesson(
          token,
          parsed.data.lessonId,
          parsed.data.originLat,
          parsed.data.originLon,
        );
        return Response.json({ directions });
      },
    },
  },
});
